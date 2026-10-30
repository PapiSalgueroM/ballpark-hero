import type { CareerState, SeasonRecord } from './soccerCareerEngine';

export const REDUCED_ROLE_GAMES = 4;
export interface ReducedRolePlan { club: string; year: number }
export interface ReducedRoleResult extends ReducedRolePlan {
  plannedReduction: 4;
  outcome: 'served' | 'interrupted';
}

const YEAR_OUT = ['BANNED', 'BANNED (PED)', 'PRISON', 'CONVICTED'];
const nextYear = (career: CareerState) => (career.seasons[career.seasons.length - 1]?.year ?? 0) + 1;
const validPlan = (plan: ReducedRolePlan) => typeof plan.club === 'string' && plan.club.length > 0
  && !YEAR_OUT.includes(plan.club) && Number.isInteger(plan.year) && plan.year > 0;

/** One selection plan at the club whose new manager reduced the role. */
export function reducedRoleForSeason(career: CareerState, club = career.currentClub, year = nextYear(career)): ReducedRolePlan | null {
  const plan = career.reducedRole;
  return plan && validPlan(plan) && !career.retired && !career.loan && plan.club === career.currentClub
    && plan.club === club && plan.year === year ? plan : null;
}

export function reducedRoleSwing(career: CareerState, club = career.currentClub, year = nextYear(career)): -4 | 0 {
  return reducedRoleForSeason(career, club, year) ? -4 : 0;
}

/** The event queues a plan; it never changes a completed season. */
export function queueReducedRole(career: CareerState): CareerState {
  const year = nextYear(career);
  if (career.retired || career.loan || !career.currentClub || YEAR_OUT.includes(career.currentClub)
    || career.currentClub.endsWith(' Youth') || !Number.isInteger(year) || year <= 0) return career;
  if (reducedRoleForSeason(career)) return career;
  return { ...career, reducedRole: { club: career.currentClub, year } };
}

/** A move, loan or retirement cannot carry the old manager's plan. */
export function cancelReducedRole(career: CareerState): void {
  delete career.reducedRole;
}

/** Consume only when this year is recorded, including an interrupted year. */
export function settleReducedRole(career: CareerState, row: SeasonRecord): void {
  const plan = career.reducedRole;
  if (!plan) return;
  if (!validPlan(plan)) { cancelReducedRole(career); return; }
  if (row.year < plan.year) return;
  cancelReducedRole(career);
  if (row.reducedRole || row.year !== plan.year) return;
  if (row.club !== plan.club && !YEAR_OUT.includes(row.club)) return;
  row.reducedRole = { ...plan, plannedReduction: REDUCED_ROLE_GAMES,
    outcome: row.type === 'playing' && row.apps > 0 && !row.injurySevere && row.club === plan.club
      ? 'served' : 'interrupted' };
}

export function readReducedRoleResult(row: SeasonRecord): ReducedRoleResult | null {
  const result = row.reducedRole;
  if (!result || !validPlan(result) || result.year !== row.year || result.plannedReduction !== REDUCED_ROLE_GAMES
    || (result.outcome !== 'served' && result.outcome !== 'interrupted')) return null;
  if (result.outcome === 'served' && (row.club !== result.club || row.type !== 'playing' || !(row.apps > 0) || row.injurySevere)) return null;
  return result;
}
