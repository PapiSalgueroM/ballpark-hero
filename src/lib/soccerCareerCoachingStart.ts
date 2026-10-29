import { choosePostRetirement } from './soccerCareerEngine';
import { adjustClubsForYear } from './careerEras';
import type { CareerState, ClubData } from './soccerCareerEngine';

export interface CoachingStartQuote {
  /** Ephemeral UI binding, never stored in the career save. */
  readonly source: CareerState;
  readonly clubId: string;
  readonly clubName: string;
  readonly country: string;
  readonly level: number;
  readonly seal: string;
}
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function firstEntry(state: CareerState): boolean {
  return state.retired === true
    && (state.phase === 'retirement_ceremony' || state.phase === 'post_retirement')
    && state.managerState == null && state.postRetirementChoice == null
    && record(state.lifeFlags) && state.lifeFlags.coachingBadges === 3;
}
function starter(club: ClubData): boolean {
  return !!club && typeof club.id === 'string' && !!club.id.trim()
    && typeof club.name === 'string' && !!club.name.trim()
    && typeof club.country === 'string' && !!club.country.trim()
    && typeof club.league === 'string' && typeof club.color === 'string'
    && Number.isInteger(club.tier) && club.tier >= 3;
}
function rank(text: string): number {
  let value = 2166136261;
  for (let i = 0; i < text.length; i++) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
  return value >>> 0;
}
function context(state: CareerState): string {
  return JSON.stringify([state.playerName, state.nationality, state.era, state.age,
    state.phase, state.retired, state.seasons.length, state.seasons[state.seasons.length - 1]?.year,
    state.lifeFlags?.coachingBadges, state.postRetirementChoice]);
}
function seal(state: CareerState, club: ClubData): string {
  return JSON.stringify([context(state), club.id, club.name, club.country, club.league, club.tier, club.color]);
}
/* Release BS fix: the clubs that exist in his first manager season, with their tier that year,
   the same year choosePostRetirement gives the job (the last season plus one). */
function eraPool(state: CareerState, clubs: readonly ClubData[]): ClubData[] {
  const year = (state.seasons[state.seasons.length - 1]?.year ?? 2024) + 1;
  return adjustClubsForYear(clubs.filter(club => !!club && typeof club === 'object'), year);
}
/** Recorded coursework offers a destination choice, not a licence or rating bonus. */
export function coachingStartChoices(state: CareerState, clubs: readonly ClubData[]): readonly CoachingStartQuote[] {
  if (!firstEntry(state)) return [];
  clubs = eraPool(state, clubs);
  const ids = new Map<string, number>();
  const names = new Map<string, number>();
  for (const club of clubs) if (club && typeof club.id === 'string') ids.set(club.id, (ids.get(club.id) ?? 0) + 1);
  for (const club of clubs) if (club && typeof club.name === 'string') names.set(club.name, (names.get(club.name) ?? 0) + 1);
  const seed = context(state);
  return clubs.filter(club => starter(club) && ids.get(club.id) === 1 && names.get(club.name) === 1)
    .map(club => ({ club, order: rank(seed + '|' + club.id) }))
    .sort((a, b) => a.order - b.order || (a.club.id < b.club.id ? -1 : a.club.id > b.club.id ? 1 : 0))
    .slice(0, 3)
    .map(({ club }) => ({ source: state, clubId: club.id, clubName: club.name,
      country: club.country, level: club.tier, seal: seal(state, club) }));
}
/** Resolve current records before the one existing canonical manager-entry draw. */
export function startCoachingAppointment(state: CareerState, clubs: readonly ClubData[], request: unknown): CareerState {
  if (!record(request) || request.source !== state) return state;
  const quote = coachingStartChoices(state, clubs).find(candidate => candidate.clubId === request.clubId
    && candidate.seal === request.seal && candidate.clubName === request.clubName
    && candidate.country === request.country && candidate.level === request.level);
  if (!quote) return state;
  const current = eraPool(state, clubs).filter(club => club && club.id === quote.clubId);
  if (current.length !== 1 || !starter(current[0]) || seal(state, current[0]) !== quote.seal) return state;
  return choosePostRetirement(state, 'manager', [current[0]]);
}
