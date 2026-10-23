import { gradeFit, type FitGrade } from '@/lib/positionFit';
import type { Position } from '@/types/game';
import type { Duty, TrainingIntensity } from '@/lib/clubManager';
import type { FormationSlot } from '@/lib/squadShape';
import type { TeamInstructions } from '@/lib/clubManagerTacticsCore';

export type CoachedStyleId = 'press' | 'link' | 'runner';
export interface CoachedStyle { v: 1; id: CoachedStyleId }
export interface CoachedStyleCourse { v: 1; to: CoachedStyleId; weeksLeft: number; weeksTotal: 6 }
export interface CoachedStylePlayer {
  id: string;
  position: Position;
  fitness: number;
  secondaryPositions?: readonly Position[];
  onLoan?: boolean;
  retraining?: unknown;
  coachedStyle?: unknown;
  coachedStyleCourse?: unknown;
}
export interface CoachedCourseContext { owned: boolean; awayOnLoan: boolean; live: boolean }
export interface CoachedStyleXiSlot {
  p: CoachedStylePlayer;
  slot: Pick<FormationSlot, 'allowed'> | null;
  duty: Duty | null;
}
export interface CoachedStyleFit {
  style: CoachedStyleId | null;
  active: boolean;
  reason: string;
  fit: FitGrade | null;
  attack: number;
}
export interface CoachedStyleXiReport {
  activeCount: number;
  attack: number;
  players: (CoachedStyleFit & { playerId: string })[];
}
export type CoachedStyleEdit<T> =
  | { ok: true; player: T; reason: null }
  | { ok: false; player: T; reason: string };

// Original game tuning. These values have not been balance-qualified.
export const COACHED_STYLE_RULES = {
  weeks: 6, attackPerPlayer: 0.006, attackCap: 0.06, growthMultiplier: 1.05,
} as const;
export function isCoachedStyleId(value: unknown): value is CoachedStyleId {
  return value === 'press' || value === 'link' || value === 'runner';
}
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
export function readCoachedStyle(player: CoachedStylePlayer): CoachedStyle | null {
  const value = player.coachedStyle;
  return record(value) && Object.keys(value).length === 2 && value.v === 1 && isCoachedStyleId(value.id)
    ? { v: 1, id: value.id } : null;
}
export function readCoachedStyleCourse(player: CoachedStylePlayer): CoachedStyleCourse | null {
  const value = player.coachedStyleCourse;
  return record(value) && Object.keys(value).length === 4 && value.v === 1 && isCoachedStyleId(value.to)
    && value.weeksTotal === 6 && Number.isInteger(value.weeksLeft)
    && (value.weeksLeft as number) >= 1 && (value.weeksLeft as number) <= 6
    ? { v: 1, to: value.to, weeksLeft: value.weeksLeft as number, weeksTotal: 6 } : null;
}
export function hasMalformedCoachedStyle(player: CoachedStylePlayer): boolean {
  return (player.coachedStyle !== undefined && !readCoachedStyle(player))
    || (player.coachedStyleCourse !== undefined && !readCoachedStyleCourse(player));
}

/** Call once from the real charged tickWeek, never from a read, preview or match-night recovery. */
export function tickCoachedStyle<T extends CoachedStylePlayer>(
  player: T, context: Pick<CoachedCourseContext, 'owned' | 'awayOnLoan'>,
): T {
  const course = readCoachedStyleCourse(player);
  if (!course || hasMalformedCoachedStyle(player) || !context.owned || context.awayOnLoan
    || player.onLoan || player.position === 'GK' || player.retraining) return player;
  if (course.weeksLeft > 1) return {
    ...player, coachedStyleCourse: { ...course, weeksLeft: course.weeksLeft - 1 },
  };
  const next = { ...player, coachedStyle: { v: 1, id: course.to } };
  delete next.coachedStyleCourse;
  return next;
}
/** Zero is active; nonzero values map to the facade's unchanged readable reasons. */
export type CoachedStyleFitStatus = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
export interface CoachedStyleFitState {
  style: CoachedStyleId | null;
  status: CoachedStyleFitStatus;
  fit: FitGrade | null;
}
function fitState(style: CoachedStyleId | null, status: CoachedStyleFitStatus, fit: FitGrade | null = null): CoachedStyleFitState {
  return { style, status, fit };
}
/** UI metadata and development use this one matching-intensity policy. */
export function coachedStyleTraining(style: CoachedStyleId): TrainingIntensity {
  return style === 'press' ? 'double' : style === 'link' ? 'normal' : 'light';
}
export function coachedStyleFitState(
  player: CoachedStylePlayer, slot: Pick<FormationSlot, 'allowed'> | null,
  duty: Duty | null, instructions: TeamInstructions,
): CoachedStyleFitState {
  const style = readCoachedStyle(player)?.id ?? null;
  if (hasMalformedCoachedStyle(player)) return fitState(style, 1);
  if (!style) return fitState(null, 2);
  if (player.position === 'GK') return fitState(style, 3);
  if (!slot) return fitState(style, 4);
  const fit = gradeFit([player.position, ...(player.secondaryPositions ?? [])], slot.allowed);
  if (fit !== 'natural' && fit !== 'family') return fitState(style, 5, fit);
  if (style === 'press') {
    if (instructions.press !== 1) return fitState(style, 6, fit);
    if (!Number.isFinite(player.fitness) || player.fitness < 60 || player.fitness > 100) return fitState(style, 7, fit);
  } else if (style === 'link') {
    if (instructions.tempo !== -1) return fitState(style, 8, fit);
    if (duty !== 'deepPlaymaker' && duty !== 'playmaker' && duty !== 'falseNine') return fitState(style, 9, fit);
  } else {
    if (instructions.tempo !== 1) return fitState(style, 10, fit);
    if (duty !== 'targetMan' && duty !== 'poacher') return fitState(style, 11, fit);
  }
  return fitState(style, 0, fit);
}
export function validCoachedStyleXi(xi: readonly CoachedStyleXiSlot[]): boolean {
  const ids = xi.map(row => row.p.id);
  return xi.length <= 11 && !ids.some(id => !id) && new Set(ids).size === ids.length;
}
/** Engine path: same actual-XI guards and capped count, without UI copy or detailed player reports. */
export function coachedStyleAttack(xi: readonly CoachedStyleXiSlot[], instructions: TeamInstructions): number {
  if (!validCoachedStyleXi(xi)) return 0;
  const activeCount = xi.filter(row => coachedStyleFitState(row.p, row.slot, row.duty, instructions).status === 0).length;
  return Math.min(COACHED_STYLE_RULES.attackCap, activeCount * COACHED_STYLE_RULES.attackPerPlayer);
}

/** Multiply the existing raw development product before its existing clamp. Decline is unchanged. */
export function coachedTrainingMultiplier(player: CoachedStylePlayer, intensity: TrainingIntensity): number {
  const style = readCoachedStyle(player)?.id;
  return style && player.position !== 'GK' && !hasMalformedCoachedStyle(player) && coachedStyleTraining(style) === intensity
    ? COACHED_STYLE_RULES.growthMultiplier : 1;
}