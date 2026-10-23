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
export const COACHED_STYLES: Record<CoachedStyleId, {
  label: string; condition: string; training: TrainingIntensity;
}> = {
  press: { label: 'Front-foot presser', condition: 'High pressing, fitness at least 60, natural or family position.', training: 'double' },
  link: { label: 'Patient outlet', condition: 'Patient tempo, deep-playmaker, playmaker or false-nine duty, natural or family position.', training: 'normal' },
  runner: { label: 'Break runner', condition: 'Direct tempo, target-man or poacher duty, natural or family position.', training: 'light' },
};

function styleId(value: unknown): value is CoachedStyleId {
  return value === 'press' || value === 'link' || value === 'runner';
}
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
export function readCoachedStyle(player: CoachedStylePlayer): CoachedStyle | null {
  const value = player.coachedStyle;
  return record(value) && Object.keys(value).length === 2 && value.v === 1 && styleId(value.id)
    ? { v: 1, id: value.id } : null;
}
export function readCoachedStyleCourse(player: CoachedStylePlayer): CoachedStyleCourse | null {
  const value = player.coachedStyleCourse;
  return record(value) && Object.keys(value).length === 4 && value.v === 1 && styleId(value.to)
    && value.weeksTotal === 6 && Number.isInteger(value.weeksLeft)
    && (value.weeksLeft as number) >= 1 && (value.weeksLeft as number) <= 6
    ? { v: 1, to: value.to, weeksLeft: value.weeksLeft as number, weeksTotal: 6 } : null;
}
function malformed(player: CoachedStylePlayer): boolean {
  return (player.coachedStyle !== undefined && !readCoachedStyle(player))
    || (player.coachedStyleCourse !== undefined && !readCoachedStyleCourse(player));
}

export function coachedCourseRefusal(
  player: CoachedStylePlayer, context: CoachedCourseContext, target?: CoachedStyleId,
): string | null {
  if (context.live) return 'Finish the match before changing a coached-style course.';
  if (!context.owned || context.awayOnLoan || player.onLoan) return 'Only an owned player at this club can learn a coached style.';
  if (player.position === 'GK') return 'Coached styles are for outfield players.';
  if (malformed(player)) return 'This coached-style save needs review. Its stored data has been kept.';
  if (player.retraining) return 'Finish or cancel position retraining first.';
  if (target !== undefined) {
    if (!styleId(target)) return 'Choose one of the three coached styles.';
    if (readCoachedStyleCourse(player)) return 'Finish or cancel the current coached-style course first.';
    if (readCoachedStyle(player)?.id === target) return 'This player has already learned that coached style.';
  }
  return null;
}
export function startCoachedStyle<T extends CoachedStylePlayer>(
  player: T, target: CoachedStyleId, context: CoachedCourseContext,
): CoachedStyleEdit<T> {
  if (!styleId(target)) return { ok: false, player, reason: 'Choose one of the three coached styles.' };
  const reason = coachedCourseRefusal(player, context, target);
  if (reason) return { ok: false, player, reason };
  return { ok: true, reason: null, player: {
    ...player, coachedStyleCourse: { v: 1, to: target, weeksLeft: 6, weeksTotal: 6 },
  } };
}
export function cancelCoachedStyle<T extends CoachedStylePlayer>(
  player: T, context: CoachedCourseContext,
): CoachedStyleEdit<T> {
  const reason = coachedCourseRefusal(player, context);
  if (reason) return { ok: false, player, reason };
  if (!readCoachedStyleCourse(player)) return { ok: false, player, reason: 'This player has no coached-style course to cancel.' };
  const next = { ...player };
  delete next.coachedStyleCourse;
  return { ok: true, player: next, reason: null };
}

/** Call once from the real charged tickWeek, never from a read, preview or match-night recovery. */
export function tickCoachedStyle<T extends CoachedStylePlayer>(
  player: T, context: Pick<CoachedCourseContext, 'owned' | 'awayOnLoan'>,
): T {
  const course = readCoachedStyleCourse(player);
  if (!course || malformed(player) || !context.owned || context.awayOnLoan
    || player.onLoan || player.position === 'GK' || player.retraining) return player;
  if (course.weeksLeft > 1) return {
    ...player, coachedStyleCourse: { ...course, weeksLeft: course.weeksLeft - 1 },
  };
  const next = { ...player, coachedStyle: { v: 1, id: course.to } };
  delete next.coachedStyleCourse;
  return next;
}
function inactive(style: CoachedStyleId | null, reason: string, fit: FitGrade | null = null): CoachedStyleFit {
  return { style, active: false, reason, fit, attack: 0 };
}

export function coachedStyleFit(
  player: CoachedStylePlayer, slot: Pick<FormationSlot, 'allowed'> | null,
  duty: Duty | null, instructions: TeamInstructions,
): CoachedStyleFit {
  const style = readCoachedStyle(player)?.id ?? null;
  if (malformed(player)) return inactive(style, 'Stored coached-style data needs review.');
  if (!style) return inactive(null, 'No coached style learned in this career.');
  if (player.position === 'GK') return inactive(style, 'Coached styles are for outfield players.');
  if (!slot) return inactive(style, 'No current formation slot.');
  const fit = gradeFit([player.position, ...(player.secondaryPositions ?? [])], slot.allowed);
  if (fit !== 'natural' && fit !== 'family') return inactive(style, 'Use a natural or family position.', fit);
  if (style === 'press') {
    if (instructions.press !== 1) return inactive(style, 'Needs high pressing.', fit);
    if (!Number.isFinite(player.fitness) || player.fitness < 60 || player.fitness > 100) {
      return inactive(style, 'Needs fitness of at least 60.', fit);
    }
  } else if (style === 'link') {
    if (instructions.tempo !== -1) return inactive(style, 'Needs patient tempo.', fit);
    if (duty !== 'deepPlaymaker' && duty !== 'playmaker' && duty !== 'falseNine') {
      return inactive(style, 'Needs a playmaker or false-nine duty.', fit);
    }
  } else {
    if (instructions.tempo !== 1) return inactive(style, 'Needs direct tempo.', fit);
    if (duty !== 'targetMan' && duty !== 'poacher') return inactive(style, 'Needs a target-man or poacher duty.', fit);
  }
  return {
    style, active: true, fit, attack: COACHED_STYLE_RULES.attackPerPlayer,
    reason: style === 'press' ? 'Active with high pressing.'
      : style === 'link' ? 'Active with patient tempo and this duty.' : 'Active with direct tempo and this duty.',
  };
}

/** The caller supplies the actual current on-pitch XI, excluding the bench and dismissed players. */
export function coachedStyleXi(xi: readonly CoachedStyleXiSlot[], instructions: TeamInstructions): CoachedStyleXiReport {
  const ids = xi.map(row => row.p.id);
  const invalid = xi.length > 11 || ids.some(id => !id) || new Set(ids).size !== ids.length;
  const players = xi.map(row => ({
    playerId: row.p.id,
    ...(invalid ? inactive(readCoachedStyle(row.p)?.id ?? null, 'Invalid on-pitch selection.')
      : coachedStyleFit(row.p, row.slot, row.duty, instructions)),
  }));
  const activeCount = players.filter(row => row.active).length;
  return { activeCount, attack: Math.min(COACHED_STYLE_RULES.attackCap,
    activeCount * COACHED_STYLE_RULES.attackPerPlayer), players };
}

/** Multiply the existing raw development product before its existing clamp. Decline is unchanged. */
export function coachedTrainingMultiplier(player: CoachedStylePlayer, intensity: TrainingIntensity): number {
  const style = readCoachedStyle(player)?.id;
  return style && player.position !== 'GK' && !malformed(player) && COACHED_STYLES[style].training === intensity
    ? COACHED_STYLE_RULES.growthMultiplier : 1;
}