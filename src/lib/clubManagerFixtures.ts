import { PREMIER_FIXTURES_2026 } from '@/data/clubManagerPremierFixtures2026';
import type { CareerState } from '@/lib/clubManager';

export const REAL_PREMIER_FIXTURE_KEY = PREMIER_FIXTURES_2026.key;
type FixtureContext = Pick<CareerState, 'realLeagueFixtures' | 'startYear' | 'season' | 'eraId' | 'customClub' | 'leagueOverrides'>;

/** Membership order stays the save's own. Only the verified set can use this list. */
export function canBindRealPremierFixtures(state: FixtureContext, leagueId: string, clubs: string[]): boolean {
  return leagueId === PREMIER_FIXTURES_2026.leagueId && state.eraId === 'now'
    && state.startYear === PREMIER_FIXTURES_2026.seasonStartYear && state.season === 1
    && !state.customClub && !state.leagueOverrides
    && clubs.length === PREMIER_FIXTURES_2026.clubs.length && new Set(clubs).size === clubs.length
    && clubs.every(club => (PREMIER_FIXTURES_2026.clubs as readonly string[]).includes(club));
}

export function realPremierFixturePairs(state: FixtureContext, leagueId: string, clubs: string[], round: number): [string, string][] | null {
  if (state.realLeagueFixtures !== REAL_PREMIER_FIXTURE_KEY || !canBindRealPremierFixtures(state, leagueId, clubs)
    || !Number.isInteger(round) || round < 0 || round >= PREMIER_FIXTURES_2026.rounds.length) return null;
  return PREMIER_FIXTURES_2026.rounds[round].map(([home, away]): [string, string] => [home, away]);
}

export function realPremierFixtureCoverage(state: FixtureContext, leagueId: string, clubs: string[]) {
  if (state.realLeagueFixtures !== REAL_PREMIER_FIXTURE_KEY || !canBindRealPremierFixtures(state, leagueId, clubs)) return null;
  return {
    key: REAL_PREMIER_FIXTURE_KEY,
    label: 'Real 2026/27 Premier League opponent order and home/away venues. Calendar dates and results are simulated.',
    sources: PREMIER_FIXTURES_2026.sources,
  };
}
