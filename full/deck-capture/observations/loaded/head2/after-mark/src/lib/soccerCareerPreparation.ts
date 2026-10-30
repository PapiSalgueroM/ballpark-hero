import type { CareerState, SeasonRecord } from './soccerCareerEngine';

export type PreparationId = 'push' | 'recovery';
export type PreparationSkill = 'shooting' | 'passing' | 'dribbling' | 'defending' | 'reflexes';
export interface CareerPreparationPlan { id: PreparationId; year: number; club: string }
export interface PreparationResult {
  id: PreparationId;
  outcome: 'completed' | 'interrupted';
  skill: PreparationSkill;
  adjustment: number;
}

const YEAR_OUT = ['BANNED', 'BANNED (PED)', 'PRISON', 'CONVICTED'];
const upcomingYear = (career: CareerState) => (career.seasons[career.seasons.length - 1]?.year ?? 0) + 1;
const valid = (plan: CareerPreparationPlan) => (plan.id === 'push' || plan.id === 'recovery')
  && Number.isInteger(plan.year) && typeof plan.club === 'string' && plan.club.length > 0;

export function preparationSkill(position: string): PreparationSkill {
  return position === 'GK' ? 'reflexes' : ['CB', 'LB', 'RB'].includes(position) ? 'defending'
    : ['CDM', 'CM', 'CAM'].includes(position) ? 'passing' : ['LW', 'RW'].includes(position) ? 'dribbling' : 'shooting';
}

export function preparationForSeason(career: CareerState, year = upcomingYear(career)): CareerPreparationPlan | null {
  const held = career.seasonPreparation;
  return held && valid(held) && !career.retired && held.year === year && held.club === career.currentClub ? held : null;
}

export function preparationInjuryDelta(career: CareerState, year = upcomingYear(career)): number {
  const held = preparationForSeason(career, year);
  return held?.id === 'push' ? 0.03 : held?.id === 'recovery' ? -0.04 : 0;
}

export function pickCareerPreparation(prev: CareerState, id: PreparationId | null): CareerState {
  if (prev.retired || prev.phase !== 'playing') return prev;
  if (id === null) {
    if (!prev.seasonPreparation) return prev;
    const next = { ...prev };
    delete next.seasonPreparation;
    return next;
  }
  if (id !== 'push' && id !== 'recovery') return prev;
  if (preparationForSeason(prev)?.id === id) return prev;
  return { ...prev, seasonPreparation: { id, year: upcomingYear(prev), club: prev.currentClub } };
}

/** After natural growth, so the plan adds no random draw and never banks an interrupted year. */
export function applyCareerPreparation(career: CareerState, row: SeasonRecord): void {
  const held = preparationForSeason(career, row.year);
  if (!held || row.preparation || row.type !== 'playing' || !(row.apps > 0) || row.injurySevere || YEAR_OUT.includes(row.club) || row.club !== held.club) return;
  const skill = preparationSkill(career.position);
  const before = career[skill];
  career[skill] = Math.max(20, Math.min(99, before + (held.id === 'push' ? 1 : -1)));
  row.preparation = { id: held.id, outcome: 'completed', skill, adjustment: career[skill] - before };
}

/** Called beside target settlement only after the engine has actually recorded this year. */
export function settleCareerPreparation(career: CareerState, row: SeasonRecord): void {
  const held = career.seasonPreparation;
  if (!held) return;
  delete career.seasonPreparation;
  if (!valid(held) || row.year !== held.year || (row.club !== held.club && !YEAR_OUT.includes(row.club))) return;
  if (!row.preparation) row.preparation = { id: held.id, outcome: 'interrupted', skill: preparationSkill(career.position), adjustment: 0 };
  const result = row.preparation;
  career.events = [...career.events, result.outcome === 'completed'
    ? `🏃 Preseason ${held.id === 'push' ? 'development push' : 'recovery focus'} complete: ${result.adjustment > 0 ? '+' : ''}${result.adjustment} ${result.skill} after growth.`
    : '🏃 Preseason plan interrupted. No development modifier carried forward.'];
}
