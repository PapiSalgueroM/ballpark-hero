import { advanceManagerSeason, managerNextSeasonYear, type CareerState, type ClubData, type ManagerState } from './soccerCareerEngine';
import { leagueKeyInYear } from './soccerCareerLeague';

type Employment = {
  club: string; clubTier: number; hasLeague: boolean; league?: string;
  hasDeparture: boolean; departure?: ManagerState['departure'];
};
type PendingMove = {
  season: number; from: Employment; to: Employment;
  rowIndex: number; rowResult: string; rowTier: number;
  eventIndex: number; eventResult: string;
};
type ReviewRecord = { version: 1; enabled: true; pending?: PendingMove };
export type ManagerJobReviewCareer = CareerState & { managerJobReview?: unknown };
export type ManagerJobChoice = 'accept' | 'stay';
export type ManagerJobQuote = { source: CareerState; season: number; destination: string };
const own = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const departure = (value: unknown) => value === undefined || typeof value === 'string' && ['sacked', 'relegated', 'mutual', 'resigned', 'poached', 'retiredPlayer'].includes(value);
function employment(ms: ManagerState): Employment {
  return { club: ms.club, clubTier: ms.clubTier, hasLeague: own(ms, 'league'), league: ms.league,
    hasDeparture: own(ms, 'departure'), departure: ms.departure };
}
function validEmployment(value: unknown): value is Employment {
  return object(value) && typeof value.club === 'string' && value.club.length > 0
    && integer(value.clubTier) && value.clubTier >= 1 && value.clubTier <= 4
    && typeof value.hasLeague === 'boolean' && (value.league === undefined || typeof value.league === 'string')
    && (value.hasLeague || value.league === undefined) && typeof value.hasDeparture === 'boolean'
    && departure(value.departure) && (value.hasDeparture || value.departure === undefined);
}
function matches(ms: ManagerState, tuple: Employment) {
  return ms.club === tuple.club && ms.clubTier === tuple.clubTier && ms.league === tuple.league && ms.departure === tuple.departure;
}
function applyEmployment(ms: ManagerState, tuple: Employment): ManagerState {
  const next = { ...ms, club: tuple.club, clubTier: tuple.clubTier };
  if (tuple.hasLeague) next.league = tuple.league; else delete next.league;
  if (tuple.hasDeparture) next.departure = tuple.departure; else delete next.departure;
  return next;
}
function uniqueClub(name: string, clubs: ClubData[]) {
  const candidates = clubs.filter(club => club.name === name);
  return candidates.length === 1 ? candidates[0] : null;
}
function boundDestination(tuple: Employment, clubs: ClubData[]) {
  const club = uniqueClub(tuple.club, clubs);
  return club?.tier === tuple.clubTier ? club : null;
}
const fragment = (move: PendingMove) => ' And HIRED by ' + move.to.club + '.';
const pendingText = (move: PendingMove) => ' Job approach from ' + move.to.club + '. Decision pending.';
const stayText = (move: PendingMove) => ' Stayed with ' + move.from.club + ' instead of joining ' + move.to.club + '.';
function replaceOwned(text: string, move: PendingMove, replacement: string) {
  const part = fragment(move);
  return text.split(part).length === 2 ? text.replace(part, replacement) : null;
}
export function readManagerJobReview(state: CareerState, clubs: ClubData[]): ReviewRecord | null {
  const raw = (state as ManagerJobReviewCareer).managerJobReview;
  if (!object(raw) || raw.version !== 1 || raw.enabled !== true) return null;
  if (raw.pending === undefined) return raw as ReviewRecord;
  const p = raw.pending, ms = state.managerState;
  if (!object(p) || state.phase !== 'manager_season' || !ms || ms.unemployed || !Array.isArray(clubs)
    || !validEmployment(p.from) || !validEmployment(p.to) || p.from.club === p.to.club || p.to.clubTier >= p.from.clubTier
    || p.to.departure !== 'poached' || !integer(p.season) || p.season !== ms.season
    || !integer(p.rowIndex) || p.rowIndex !== ms.seasonResults.length - 1
    || !integer(p.eventIndex) || p.eventIndex >= state.events.length
    || typeof p.rowResult !== 'string' || typeof p.eventResult !== 'string'
    || p.rowTier !== p.to.clubTier || !matches(ms, p.from)) return null;
  const move = p as PendingMove, row = ms.seasonResults[move.rowIndex];
  /* Release BS fix: Stay restores the stored from tuple, so the source club need not be in the list
     (a job taken off the market often is not); it stays bound to the live employment by matches(). */
  const destination = boundDestination(move.to, clubs);
  if (!destination || (leagueKeyInYear(destination, managerNextSeasonYear(state)) ?? destination.league) !== move.to.league
    || row.club !== move.from.club || row.year !== move.season || row.tier !== move.from.clubTier
    || (row.playerPos !== 3 && row.playerPos !== 4)
    || !move.eventResult.startsWith('📋 Manager Season ' + move.season + ': ')
    || row.result !== replaceOwned(move.rowResult, move, pendingText(move))
    || state.events[move.eventIndex] !== replaceOwned(move.eventResult, move, pendingText(move))) return null;
  return raw as ReviewRecord;
}
export function setManagerJobReview(state: CareerState, clubs: ClubData[], enabled: boolean): CareerState {
  if (typeof enabled !== 'boolean' || state.phase !== 'manager_season' || !state.managerState || state.managerState.unemployed
    || readManagerJobReview(state, clubs)?.pending) return state;
  const current = readManagerJobReview(state, clubs);
  if (enabled && current?.enabled) return state;
  if (!enabled && (state as ManagerJobReviewCareer).managerJobReview === undefined) return state;
  const next: ManagerJobReviewCareer = { ...state };
  if (enabled) next.managerJobReview = { version: 1, enabled: true };
  else delete next.managerJobReview;
  return next;
}
export function advanceReviewedManagerSeason(state: CareerState, clubs: ClubData[]): CareerState {
  const review = readManagerJobReview(state, clubs);
  if (review?.pending) return state;
  const finished = advanceManagerSeason(state, clubs);
  if (!review?.enabled || state.phase !== 'manager_season' || !Array.isArray(clubs)) return finished;
  const before = state.managerState, after = finished.managerState;
  if (!before || !after || before.unemployed || after.unemployed || after.season !== before.season + 1
    || after.club === before.club || after.clubTier >= before.clubTier || after.departure !== 'poached'
    || after.promotions !== before.promotions || after.seasonResults.length !== before.seasonResults.length + 1) return finished;
  const rowIndex = after.seasonResults.length - 1, row = after.seasonResults[rowIndex], eventIndex = state.events.length;
  if (row.club !== before.club || row.year !== after.season || (row.playerPos !== 3 && row.playerPos !== 4)
    || typeof row.result !== 'string' || typeof finished.events[eventIndex] !== 'string') return finished;
  const move: PendingMove = { season: after.season, from: employment(before), to: employment(after),
    rowIndex, rowResult: row.result, rowTier: row.tier, eventIndex, eventResult: finished.events[eventIndex] };
  /* Release BS fix: Stay restores the stored from tuple, so the source club need not be in the list
     (a job taken off the market often is not); it stays bound to the live employment by matches(). */
  const destination = boundDestination(move.to, clubs);
  if (!destination || row.tier !== after.clubTier
    || (leagueKeyInYear(destination, managerNextSeasonYear(finished)) ?? destination.league) !== move.to.league) return finished;
  const rowResult = replaceOwned(move.rowResult, move, pendingText(move)), eventResult = replaceOwned(move.eventResult, move, pendingText(move));
  if (rowResult === null || eventResult === null || !move.eventResult.startsWith('📋 Manager Season ' + move.season + ': ')) return finished;
  const rows = after.seasonResults.slice(); rows[rowIndex] = { ...row, tier: before.clubTier, result: rowResult };
  const events = finished.events.slice(); events[eventIndex] = eventResult;
  return { ...finished, managerState: { ...applyEmployment(after, move.from), seasonResults: rows }, events,
    managerJobReview: { version: 1, enabled: true, pending: move } } as ManagerJobReviewCareer;
}
export function quoteManagerJob(state: CareerState, clubs: ClubData[]): ManagerJobQuote | null {
  const pending = readManagerJobReview(state, clubs)?.pending;
  return pending ? { source: state, season: pending.season, destination: pending.to.club } : null;
}
export function resolveManagerJob(state: CareerState, clubs: ClubData[], quote: ManagerJobQuote, choice: ManagerJobChoice): CareerState {
  if (!quote || quote.source !== state || (choice !== 'accept' && choice !== 'stay')) return state;
  const pending = readManagerJobReview(state, clubs)?.pending, ms = state.managerState;
  if (!pending || !ms || quote.season !== pending.season || quote.destination !== pending.to.club) return state;
  const row = ms.seasonResults[pending.rowIndex], rows = ms.seasonResults.slice(), events = state.events.slice();
  const accepting = choice === 'accept';
  rows[pending.rowIndex] = { ...row, tier: accepting ? pending.rowTier : pending.from.clubTier,
    result: accepting ? pending.rowResult : replaceOwned(pending.rowResult, pending, stayText(pending))! };
  events[pending.eventIndex] = accepting ? pending.eventResult : replaceOwned(pending.eventResult, pending, stayText(pending))!;
  return { ...state, managerState: { ...applyEmployment(ms, accepting ? pending.to : pending.from), seasonResults: rows },
    events, managerJobReview: { version: 1, enabled: true } } as ManagerJobReviewCareer;
}
