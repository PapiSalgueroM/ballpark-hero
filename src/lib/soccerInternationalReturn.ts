import type { CareerState, SeasonRecord } from './soccerCareerEngine';

export interface SoccerInternationalReturn {
  version: 1;
  sourceCount: number;
  sourceYear: number;
  sourceAge: number;
  nationality: string;
  caps: number;
}

export interface InternationalReturnEligibility {
  available: boolean;
  reason: string;
}

const RETURN_EVENT = 'Made yourself available for national-team selection again. A squad place still has to be earned.';
const receiptKeys = ['version', 'sourceCount', 'sourceYear', 'sourceAge', 'nationality', 'caps'];
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const count = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const adultAge = (value: unknown): value is number => count(value) && value >= 18 && value <= 44;

function seniorRow(value: unknown): value is SeasonRecord {
  return record(value) && value.type === 'playing' && count(value.year) && value.year > 0
    && adultAge(value.age) && text(value.club) && count(value.clubTier)
    && ((value.clubTier >= 1 && value.clubTier <= 4)
      || (value.clubTier === 99 && value.apps === 0 && ['BANNED', 'BANNED (PED)', 'PRISON', 'CONVICTED'].includes(value.club)));
}

/** A held receipt follows the recorded season, including after a club move. */
export function readInternationalReturn(career: CareerState): SoccerInternationalReturn | null {
  if (!record(career) || !Array.isArray(career.seasons) || !record(career.intStats)) return null;
  const value: unknown = career.internationalReturn;
  if (!record(value) || Object.keys(value).length !== receiptKeys.length
    || receiptKeys.some(key => !Object.prototype.hasOwnProperty.call(value, key))) return null;
  if (value.version !== 1 || !count(value.sourceCount) || value.sourceCount < 1 || value.sourceCount > career.seasons.length
    || !count(value.sourceYear) || value.sourceYear < 1 || !adultAge(value.sourceAge)
    || !text(value.nationality) || value.nationality !== career.nationality
    || !count(value.caps) || value.caps < 1 || !count(career.intStats.caps) || value.caps > career.intStats.caps) return null;
  const source = career.seasons[value.sourceCount - 1];
  const latest = career.seasons[career.seasons.length - 1];
  const elapsed = career.seasons.length - value.sourceCount;
  if (!seniorRow(source) || source.year !== value.sourceYear || source.age !== value.sourceAge
    || !record(latest) || !count(latest.year) || !count(latest.age)
    || latest.year !== source.year + elapsed || latest.age !== source.age + elapsed
    || !count(career.age) || career.age < source.age + elapsed) return null;
  return value as unknown as SoccerInternationalReturn;
}

export function internationalReturnEligibility(career: CareerState): InternationalReturnEligibility {
  const blocked = (reason: string): InternationalReturnEligibility => ({ available: false, reason });
  if (!record(career) || career.phase !== 'playing' || career.retired !== false) {
    return blocked('This choice is available while continuing your playing career.');
  }
  if (!adultAge(career.age)) return blocked('This choice is available from age 18 to 44.');
  if (!Array.isArray(career.seasons) || !text(career.currentClub) || !text(career.nationality)
    || !count(career.currentClubTier) || career.currentClubTier < 1 || career.currentClubTier > 4
    || !Array.isArray(career.events) || !career.events.every(event => typeof event === 'string')
    || !record(career.intStats) || !count(career.intStats.caps) || career.intStats.caps < 1
    || !count(career.intStats.goals) || !count(career.intStats.assists) || typeof career.intStats.isCaptain !== 'boolean') {
    return blocked('A verified senior international record is needed first.');
  }
  const latest = career.seasons[career.seasons.length - 1];
  if (!seniorRow(latest) || latest.age !== career.age) return blocked('Finish the current senior season first.');
  if (!Array.isArray(career.pendingEvents) || career.pendingEvents.length > 0
    || career.pendingSummary != null || career.pendingRehab != null || career.pendingBallonDor != null
    || career.pendingWorldCup != null || career.pendingTournament != null || career.pendingRivalryEvent != null) {
    return blocked('Finish the current season decisions and ceremonies first.');
  }
  const held = readInternationalReturn(career);
  if (Object.prototype.hasOwnProperty.call(career, 'internationalReturn') && !held) {
    return blocked('The saved availability change could not be verified.');
  }
  if (held && (career.seasons.length <= held.sourceCount || latest.year <= held.sourceYear)) {
    return blocked('You already changed your international plans this season.');
  }
  if (career.internationalCareer !== false || career.intStats.isRetired !== true) {
    return blocked('You must have retired from international football before making yourself available again.');
  }
  return { available: true, reason: 'A squad place still has to be earned through the existing selection process.' };
}

export function makeInternationallyAvailable(prev: CareerState): CareerState {
  if (!internationalReturnEligibility(prev).available) return prev;
  const source = prev.seasons[prev.seasons.length - 1];
  return {
    ...prev,
    internationalCareer: true,
    intStats: { ...prev.intStats, isRetired: false },
    internationalReturn: {
      version: 1, sourceCount: prev.seasons.length, sourceYear: source.year,
      sourceAge: source.age, nationality: prev.nationality, caps: prev.intStats.caps,
    },
    events: [...prev.events, RETURN_EVENT],
  };
}
