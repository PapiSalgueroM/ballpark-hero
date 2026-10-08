import type { PitchFigure, PitchInput, PitchLine, PitchPoint, PitchSide } from '@/components/pitch-motion/contract';
import { BEAT_SPAN } from '@/components/pitch-motion/contract';
import type { MotionPlayer, MotionScene } from '@/components/pitch-motion/motion';
import { keyedRng } from '@/lib/keyedRng';

/** Round 1101: where everybody stands between the lines of a feed. Pure functions of (input, clock):
 *  no React, no clock of its own, and never Math.random. Everything drawn between events comes from
 *  keyedRng, one fresh stream per beat, so beat i never depends on how many draws another beat made.
 *  It decides nothing about the match: no goal, shot or minute is made here. */

/** A figure placed on the pitch for one scene. */
export interface PitchPlaced extends MotionPlayer { line: PitchLine }

type BeatState = 'open';
interface PlanEntry {
  /** Where this stretch starts on the binder's clock. */
  start: number;
  state: BeatState;
  /** The side with the ball. */
  side: PitchSide;
  /** The key of the figure on the ball, or null when that side has nobody on the pitch. */
  carrier: string | null;
}
/** Opaque to binders: build it with pitchPlan and hand it back to pitchScene and pitchSceneKey. */
export interface PitchPlan {
  readonly mine: PitchFigure[];
  readonly theirs: PitchFigure[];
  readonly seed: number;
  readonly from: number;
  readonly entries: PlanEntry[];
}

/** Who gets the ball: the front men most, the keeper hardly ever. */
const CARRY: Record<PitchLine, number> = { attack: 3, midfield: 2.6, defence: 1.2, keeper: 0.25 };
/** How far each line steps up when its side has the ball, in percent of the pitch. */
const PUSH: Record<PitchLine, number> = { attack: 20, midfield: 17, defence: 14, keeper: 4 };
/** How far each line drops toward its own goal when the other side has it. */
const BACK: Record<PitchLine, number> = { attack: 9, midfield: 8, defence: 5, keeper: 0 };
const clampPct = (v: number) => Math.max(3, Math.min(97, v));

function weightedPick(list: PitchFigure[], roll: number, skip: string | null): PitchFigure | null {
  if (!list.length) return null;
  const weights = list.map(f => (f.key === skip && list.length > 1 ? 0 : CARRY[f.line]));
  const total = weights.reduce((sum, w) => sum + w, 0);
  let left = roll * total;
  for (let i = 0; i < list.length; i++) { left -= weights[i]; if (left <= 0) return list[i]; }
  return list[list.length - 1];
}

/** Cuts the stretch into beats and says, for each, which side has the ball and who is on it. */
export function pitchPlan(input: PitchInput): PitchPlan {
  const seed = input.seed ?? 0;
  const possession = input.possession ?? 0.5;
  const from = input.span.from;
  const beats = Math.max(1, Math.ceil((input.span.to - from) / BEAT_SPAN - 1e-9));
  const entries: PlanEntry[] = [];
  let previous: string | null = null;
  for (let i = 0; i < beats; i++) {
    let side: PitchSide = keyedRng(`${seed}:s:${Math.floor(i / 3)}`)() < possession ? 'me' : 'opp';
    if (!(side === 'me' ? input.mine : input.theirs).length) side = side === 'me' ? 'opp' : 'me';
    const list = side === 'me' ? input.mine : input.theirs;
    const picked = weightedPick(list, keyedRng(`${seed}:${i}`)(), previous);
    previous = picked ? picked.key : null;
    entries.push({ start: from + i * BEAT_SPAN, state: 'open', side, carrier: previous });
  }
  return { mine: input.mine, theirs: input.theirs, seed, from, entries };
}

function entryIndex(plan: PitchPlan, clock: number): number {
  const i = Math.floor((clock - plan.from) / BEAT_SPAN + 1e-9);
  return Math.max(0, Math.min(plan.entries.length - 1, i));
}

/** Changes exactly when the scene changes, so a binder can memoise the scene on it. */
export function pitchSceneKey(plan: PitchPlan, clock: number): string {
  return String(entryIndex(plan, clock));
}

function placeSide(figures: PitchFigure[], side: PitchSide, hasBall: boolean, drift: () => number, ballX: number | null): PitchPlaced[] {
  return figures.map(f => {
    let x = side === 'me' ? f.slot.x : 100 - f.slot.x;
    let y = side === 'me' ? f.slot.y : 100 - f.slot.y;
    const dir = side === 'me' ? -1 : 1;
    if (hasBall) {
      y += dir * PUSH[f.line];
      if (f.line === 'keeper') y = side === 'me' ? Math.max(y, 68) : Math.min(y, 32);
      else y = side === 'me' ? Math.max(y, 7) : Math.min(y, 93);
    } else {
      y -= dir * BACK[f.line];
      x = 50 + (x - 50) * 0.86;
    }
    if (ballX !== null && f.line !== 'keeper' && Math.abs(f.slot.x - 50) >= 22) x += (ballX - x) * 0.18;
    x += drift();
    y += drift();
    const placed: PitchPlaced = { key: f.key, keeper: f.line === 'keeper', line: f.line, x: clampPct(x), y: clampPct(y) };
    if (f.name !== undefined) placed.name = f.name;
    return placed;
  });
}

/** Both sides and the ball for the stretch the clock is in. */
export function pitchScene(plan: PitchPlan, clock: number): MotionScene<PitchPlaced> {
  const index = entryIndex(plan, clock);
  const entry = plan.entries[index];
  const mineHasIt = entry.side === 'me';
  const place = (ballX: number | null) => {
    const rng = keyedRng(`${plan.seed}:d:${index}`);
    const drift = () => (rng() - 0.5) * 5;
    return {
      mine: placeSide(plan.mine, 'me', mineHasIt, drift, ballX),
      theirs: placeSide(plan.theirs, 'opp', !mineHasIt, drift, ballX),
    };
  };
  const ballFrom = (holder: PitchPlaced | undefined): PitchPoint => (holder
    ? { x: clampPct(holder.x + 1.6), y: clampPct(holder.y + (mineHasIt ? -2.2 : 2.2)) }
    : { x: 50, y: 50 });
  const holderOf = (sides: { mine: PitchPlaced[]; theirs: PitchPlaced[] }) => (mineHasIt ? sides.mine : sides.theirs).find(p => p.key === entry.carrier);
  const lean = ballFrom(holderOf(place(null)));
  const sides = place(lean.x);
  const holder = holderOf(sides);
  return { mine: sides.mine, theirs: sides.theirs, ball: ballFrom(holder), holderKey: holder?.key ?? null };
}
