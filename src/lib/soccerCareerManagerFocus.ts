import type { CareerState, ManagerState } from './soccerCareerEngine';

export type ManagerSeasonFocus = 'league' | 'cup';
export type ManagerSeasonFocusChoice = ManagerSeasonFocus | 'balanced';
export type ManagerSeasonFocusCareer = CareerState & { managerSeasonFocus?: unknown };
type FocusRecord = { version: 1; club: string; clubTier: number; league?: string; season: number; focus: ManagerSeasonFocus };
const own = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
function employed(state: CareerState): ManagerState | null {
  const ms = state.managerState;
  return state.phase === 'manager_season' && state.retired === true && ms
    && (ms.unemployed === undefined || ms.unemployed === false)
    && typeof ms.club === 'string' && ms.club.trim().length > 0
    && Number.isSafeInteger(ms.clubTier) && ms.clubTier >= 1 && ms.clubTier <= 4
    && Number.isSafeInteger(ms.season) && ms.season >= 0
    && (ms.league === undefined || typeof ms.league === 'string' && ms.league.trim().length > 0) ? ms : null;
}
/** Read only the preparation bound to this unplayed employed club season. */
export function readManagerSeasonFocus(state: CareerState): ManagerSeasonFocus | null {
  const ms = employed(state), raw = (state as ManagerSeasonFocusCareer).managerSeasonFocus;
  if (!ms || !object(raw) || raw.version !== 1 || (raw.focus !== 'league' && raw.focus !== 'cup')
    || raw.club !== ms.club || raw.clubTier !== ms.clubTier || raw.season !== ms.season
    || own(raw, 'league') !== own(ms, 'league') || raw.league !== ms.league) return null;
  return raw.focus;
}
export function managerSeasonFocusAvailable(state: CareerState): boolean {
  return !!employed(state);
}
/** A deliberate choice only. Invalid saved metadata is never repaired here. */
export function chooseManagerSeasonFocus(state: CareerState, choice: unknown): CareerState {
  if ((choice !== 'balanced' && choice !== 'league' && choice !== 'cup') || !managerSeasonFocusAvailable(state)) return state;
  const current = readManagerSeasonFocus(state);
  if (choice === 'balanced' ? !own(state, 'managerSeasonFocus') : choice === current) return state;
  const next: ManagerSeasonFocusCareer = { ...state };
  if (choice === 'balanced') delete next.managerSeasonFocus;
  else {
    const ms = state.managerState!;
    const record: FocusRecord = { version: 1, club: ms.club, clubTier: ms.clubTier,
      ...(own(ms, 'league') ? { league: ms.league } : {}), season: ms.season, focus: choice };
    next.managerSeasonFocus = record;
  }
  return next;
}
