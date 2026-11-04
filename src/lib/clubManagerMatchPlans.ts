import { FORMATIONS, effectiveXIWithSlots, matchStrengthNow } from '@/lib/clubManager';
import type { CareerState } from '@/lib/clubManager';
import { matchPlansOf, withPlan } from '@/lib/clubManagerMatchPlansCore';
export {
  MATCH_PLAN_LIMIT, MATCH_PLAN_NAME_LIMIT, matchPlansOf, canEditMatchPlans,
  saveMatchPlan, applyMatchPlan, deleteMatchPlan,
} from '@/lib/clubManagerMatchPlansCore';
export type { SavedMatchPlanV1, SavedMatchPlanV2, SavedMatchPlan } from '@/lib/clubManagerMatchPlansCore';

/** Uses the same slot objects and lineup resolver as kick off, including international rest replacements. */
export function previewMatchPlan(career: CareerState, slot: number) {
  const plan = matchPlansOf(career).find(p => p.slot === slot);
  if (!plan) return null;
  const state = withPlan(career, plan);
  const formation = FORMATIONS[plan.formationIndex];
  const actual = effectiveXIWithSlots(state);
  const rows = formation.slots.map((position, i) => {
    const pickedId = plan.xiIds[i];
    const picked = career.squad.find(p => p.id === pickedId) ?? null;
    const kickoff = actual.find(x => x.slot === position) ?? null;
    const reason = !pickedId ? 'Empty spot' : !picked ? 'Left the squad'
      : picked.injuryWeeks > 0 ? 'Injured' : picked.suspendedMatches > 0 ? 'Suspended'
        : kickoff?.p.id !== pickedId ? 'Already used in another spot' : null;
    return { slot: i, label: position.label, picked, pickedId, player: kickoff?.p ?? null, duty: kickoff?.duty ?? null, reason };
  });
  return {
    plan, state, rows,
    currentStrength: matchStrengthNow(career), strength: matchStrengthNow(state),
    fitness: actual.length ? actual.reduce((sum, x) => sum + x.p.fitness, 0) / actual.length : null,
    replacements: rows.filter(row => row.player?.id !== row.pickedId).length,
  };
}
