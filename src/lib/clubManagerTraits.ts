import type { FitGrade } from '@/lib/positionFit';
import type { Duty, TrainingIntensity } from '@/lib/clubManager';
import type { FormationSlot } from '@/lib/squadShape';
import type { TeamInstructions } from '@/lib/clubManagerTacticsCore';
import {
  COACHED_STYLE_RULES, coachedStyleFitState, coachedStyleTraining, validCoachedStyleXi,
  readCoachedStyle,
} from '@/lib/clubManagerTraitRuntime';
import type {
  CoachedStyleId, CoachedStylePlayer, CoachedStyleXiSlot, CoachedStyleFit, CoachedStyleXiReport,
} from '@/lib/clubManagerTraitRuntime';
export { COACHED_STYLE_RULES } from '@/lib/clubManagerTraitRuntime';
export type {
  CoachedStyleId, CoachedStyle, CoachedStyleCourse, CoachedStylePlayer, CoachedCourseContext,
  CoachedStyleXiSlot, CoachedStyleFit, CoachedStyleXiReport, CoachedStyleEdit,
} from '@/lib/clubManagerTraitRuntime';

export const COACHED_STYLES: Record<CoachedStyleId, {
  label: string; condition: string; training: TrainingIntensity;
}> = {
  press: { label: 'Front-foot presser', condition: 'High pressing, fitness at least 60, natural or family position.', get training() { return coachedStyleTraining('press'); } },
  link: { label: 'Patient outlet', condition: 'Patient tempo, deep-playmaker, playmaker or false-nine duty, natural or family position.', get training() { return coachedStyleTraining('link'); } },
  runner: { label: 'Break runner', condition: 'Direct tempo, target-man or poacher duty, natural or family position.', get training() { return coachedStyleTraining('runner'); } },
};

export { readCoachedStyle, readCoachedStyleCourse } from '@/lib/clubManagerTraitRuntime';

export { coachedCourseRefusal, startCoachedStyle, cancelCoachedStyle } from '@/lib/clubManagerTraitEdits';

export { tickCoachedStyle } from '@/lib/clubManagerTraitRuntime';

function inactive(style: CoachedStyleId | null, reason: string, fit: FitGrade | null = null): CoachedStyleFit {
  return { style, active: false, reason, fit, attack: 0 };
}

const FIT_REASONS = [
  '',
  'Stored coached-style data needs review.',
  'No coached style learned in this career.',
  'Coached styles are for outfield players.',
  'No current formation slot.',
  'Use a natural or family position.',
  'Needs high pressing.',
  'Needs fitness of at least 60.',
  'Needs patient tempo.',
  'Needs a playmaker or false-nine duty.',
  'Needs direct tempo.',
  'Needs a target-man or poacher duty.',
] as const;

export function coachedStyleFit(
  player: CoachedStylePlayer, slot: Pick<FormationSlot, 'allowed'> | null,
  duty: Duty | null, instructions: TeamInstructions,
): CoachedStyleFit {
  const result = coachedStyleFitState(player, slot, duty, instructions);
  if (result.status !== 0) return inactive(result.style, FIT_REASONS[result.status], result.fit);
  return {
    style: result.style, active: true, fit: result.fit, attack: COACHED_STYLE_RULES.attackPerPlayer,
    reason: result.style === 'press' ? 'Active with high pressing.'
      : result.style === 'link' ? 'Active with patient tempo and this duty.' : 'Active with direct tempo and this duty.',
  };
}

/** The caller supplies the actual current on-pitch XI, excluding the bench and dismissed players. */
export function coachedStyleXi(xi: readonly CoachedStyleXiSlot[], instructions: TeamInstructions): CoachedStyleXiReport {
  const invalid = !validCoachedStyleXi(xi);
  const players = xi.map(row => ({
    playerId: row.p.id,
    ...(invalid ? inactive(readCoachedStyle(row.p)?.id ?? null, 'Invalid on-pitch selection.')
      : coachedStyleFit(row.p, row.slot, row.duty, instructions)),
  }));
  const activeCount = players.filter(row => row.active).length;
  return { activeCount, attack: Math.min(COACHED_STYLE_RULES.attackCap,
    activeCount * COACHED_STYLE_RULES.attackPerPlayer), players };
}

export { coachedTrainingMultiplier } from '@/lib/clubManagerTraitRuntime';
