import type { CareerState } from './soccerCareerEngine';

export interface SoccerFarewellPlan {
  version: 1;
  year: number;
  sourceCount: number;
  sourceYear: number;
  sourceAge: number;
  announcedAge: number;
  club: string;
  sourcePhase: 'playing' | 'retirement_suggestion';
}

export interface SoccerFarewellEligibility {
  eligible: boolean;
  year: number | null;
  reason: string;
}

const keys = ['version', 'year', 'sourceCount', 'sourceYear', 'sourceAge', 'announcedAge', 'club', 'sourcePhase'];
const integer = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
const clubName = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

/** Only the announced year and its original saved source can activate retirement. */
export function readSoccerFarewell(career: CareerState): SoccerFarewellPlan | null {
  const raw: unknown = career.farewellSeason;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  if (Object.keys(value).length !== keys.length || keys.some(key => !Object.prototype.hasOwnProperty.call(value, key))) return null;
  if (value.version !== 1 || !integer(value.year, 1901, 9999) || !integer(value.sourceYear, 1900, 9998)
    || !integer(value.sourceCount, 1, Number.MAX_SAFE_INTEGER) || !integer(value.sourceAge, 18, 43)
    || !integer(value.announcedAge, 30, 44) || !clubName(value.club)
    || (value.sourcePhase !== 'playing' && value.sourcePhase !== 'retirement_suggestion')) return null;
  if (value.year !== value.sourceYear + 1 || value.announcedAge !== value.sourceAge + (value.sourcePhase === 'playing' ? 0 : 1)) return null;
  if (!Array.isArray(career.seasons) || (career.seasons.length !== value.sourceCount && career.seasons.length !== value.sourceCount + 1)) return null;
  const source = career.seasons[value.sourceCount - 1];
  if (!source || source.type !== 'playing' || source.year !== value.sourceYear || source.age !== value.sourceAge) return null;
  if (career.seasons.length === value.sourceCount) {
    if (career.age !== value.announcedAge && career.age !== value.sourceAge + 1) return null;
  } else {
    const final = career.seasons[value.sourceCount];
    if (!final || (final.type !== 'playing' && final.type !== 'retired') || final.year !== value.year
      || final.age !== value.sourceAge + 1 || career.age !== final.age) return null;
  }
  return raw as SoccerFarewellPlan;
}

export function farewellEligibility(career: CareerState): SoccerFarewellEligibility {
  const unavailable = (reason: string): SoccerFarewellEligibility => ({ eligible: false, year: null, reason });
  const held = readSoccerFarewell(career);
  if (held) return { eligible: false, year: held.year, reason: 'Your farewell year is already saved.' };
  if (career.farewellSeason !== undefined) return unavailable('This saved farewell plan cannot be verified.');
  if (career.retired || (career.phase !== 'playing' && career.phase !== 'retirement_suggestion')) return unavailable('Choose a farewell year between seasons or at a retirement suggestion.');
  if (!integer(career.age, 30, 44)) return unavailable('A farewell year is available from age 30.');
  const seasons = career.seasons;
  const last = Array.isArray(seasons) ? seasons[seasons.length - 1] : null;
  if (!last || last.type !== 'playing' || !integer(last.year, 1900, 9998) || !integer(last.age, 18, 43)
    || !clubName(career.currentClub) || !seasons.some(row => row.type === 'playing' && integer(row.clubTier, 1, 4))) return unavailable('A saved senior playing season is needed first.');
  const pendingAge = last.age + 1;
  if (career.age !== last.age + (career.phase === 'retirement_suggestion' ? 1 : 0)) return unavailable('The saved season and pending age do not match.');
  if (pendingAge >= 45 || !Number.isFinite(career.overall) || (career.overall < 50 && pendingAge >= 33)) return unavailable('The existing forced retirement limit comes before another playing season.');
  return { eligible: true, year: last.year + 1, reason: 'Play the declared year, then retire after its summary and queued ceremonies. An interrupted year still counts.' };
}

export function announceSoccerFarewell(career: CareerState): CareerState {
  const eligibility = farewellEligibility(career);
  if (!eligibility.eligible) return career;
  const source = career.seasons[career.seasons.length - 1];
  const plan: SoccerFarewellPlan = {
    version: 1, year: eligibility.year!, sourceCount: career.seasons.length,
    sourceYear: source.year, sourceAge: source.age, announcedAge: career.age,
    club: career.currentClub, sourcePhase: career.phase as SoccerFarewellPlan['sourcePhase'],
  };
  return {
    ...career, farewellSeason: plan, isFinalSeason: true,
    events: [...career.events, `👋 Announced ${plan.year} as your farewell season. Retirement follows that year's summary and queued ceremonies.`],
  };
}

export function farewellSeasonComplete(career: CareerState): boolean {
  const plan = readSoccerFarewell(career);
  return !!plan && career.seasons.length === plan.sourceCount + 1 && career.seasons[plan.sourceCount].type === 'playing';
}
