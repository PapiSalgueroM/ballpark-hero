import { afterEach, describe, expect, it, vi } from 'vitest';
import { rngFrom } from '@/lib/careerEngine';
import { advanceProSeason, FALLBACK_CLUBS, initCareer, repairCareer, simulateUCL, type CareerState, type SeasonRecord } from '@/lib/soccerCareerEngine';
import { parseSoccerCareerSave, serializeSoccerCareerSave } from '@/lib/soccerCareerSave';

const career = {
  currentClub: 'Real Madrid',
  currentClubCountry: 'Spain',
  currentClubTier: 1,
  overall: 92,
  position: 'ST',
  seasons: [{ year: 2025 }],
} as CareerState;

const season = {
  year: 2026,
  type: 'playing',
  ovr: 92,
  rating: 8.1,
  leagueApps: 34,
} as SeasonRecord;

function run(player: CareerState, line: SeasonRecord, seed: number) {
  const random = vi.spyOn(Math, 'random').mockImplementation(rngFrom(seed));
  try {
    return simulateUCL(player, line);
  } finally {
    random.mockRestore();
  }
}

afterEach(() => vi.restoreAllMocks());

describe('Soccer Career Champions League form', () => {
  it('rewards a strong full season in the knockouts without changing the route into them', () => {
    let strongWins = 0;
    let quietWins = 0;
    for (let i = 1; i <= 400; i++) {
      const seed = 495127 + i * 20753;
      const strong = run(career, season, seed);
      const quiet = run(career, { ...season, rating: 6.3 }, seed);
      expect(strong.qualified).toBe(quiet.qualified);
      expect(strong.firstStage).toEqual(quiet.firstStage);
      expect(strong.matches.filter(match => match.round === 'PO')).toEqual(quiet.matches.filter(match => match.round === 'PO'));
      strongWins += Number(strong.result === 'Winner');
      quietWins += Number(quiet.result === 'Winner');
      for (const match of strong.matches) expect(match.playerGoals).toBeLessThanOrEqual(match.goalsFor);
    }
    expect(strongWins).toBeGreaterThan(quietWins);
  });

  it('requires a played season, regular league appearances and a measured overall', () => {
    for (const control of [
      { leagueApps: 7 },
      { leagueApps: undefined },
      { ovr: undefined },
      { injurySevere: true },
      { type: 'manager' as const },
    ]) {
      for (const seed of [495127, 515880, 536633]) {
        expect(run(career, { ...season, ...control }, seed)).toEqual(run(career, { ...season, rating: 6.3 }, seed));
      }
    }
  });

  it('leaves the Libertadores on its own balance rules', () => {
    const flamengo = { ...career, currentClub: 'Flamengo', currentClubCountry: 'Brazil' };
    for (const seed of [495127, 515880, 536633]) {
      expect(run(flamengo, season, seed)).toEqual(run(flamengo, { ...season, rating: 6.3 }, seed));
    }
  });

  it('records a new campaign through the season advance and preserves the previous saved run', () => {
    vi.spyOn(Math, 'random').mockImplementation(rngFrom(98812));
    const attrs = { pace: 92, shooting: 92, passing: 92, dribbling: 92, defending: 75, physical: 92, reflexes: 30 };
    const initial = initCareer('Synthetic Career', 'Spain', 'ST', 'modern', attrs, 92, 2025, FALLBACK_CLUBS, null, 96, null, null, 'Real Madrid');
    const previousRun = run(career, season, 536633);
    const start = {
      ...initial, ...attrs, ...career, age: 26, phase: 'playing', currentLeague: 'La Liga',
      contractYearsLeft: 4, seasons: [{
        ...initial.seasons[0], ...season, year: 2025, age: 26, club: 'Real Madrid', clubCupRun: previousRun,
      }],
    } satisfies CareerState;
    vi.spyOn(Math, 'random').mockImplementation(rngFrom(98812));
    const result = advanceProSeason(start, FALLBACK_CLUBS);
    expect(result.pendingSummary?.leagueApps).toBeGreaterThanOrEqual(20);
    expect(result.lastUCLResult?.qualified).toBe(true);
    const restored = repairCareer(parseSoccerCareerSave(serializeSoccerCareerSave(result)) as CareerState);
    expect(restored.lastUCLResult).toEqual(result.lastUCLResult);
    expect(restored.seasons[0].clubCupRun).toEqual(previousRun);
    expect(restored.seasons.at(-1)?.clubCupRun).toEqual(result.lastUCLResult);
  });
});
