import { afterEach, expect, it, vi } from 'vitest';
import { advanceProSeason, FALLBACK_CLUBS, getCareerTotals, initCareer, repairCareer } from '@/lib/soccerCareerEngine';
import { careerOpeningAnnualStats } from '@/lib/soccerCareerExtraCups';
import { readClubWorldCup, wonClubWorldCup } from '@/lib/soccerClubWorldCup';
import { savedSeasonCompetitions } from '@/lib/soccerSeasonCompetitions';
import { keyedRng } from '@/lib/keyedRng';
import { isSoccerCareerSave } from '@/lib/soccerCareerSave';

afterEach(() => vi.restoreAllMocks());

function opening(name: string, clubName: string, year: number) {
  const club = FALLBACK_CLUBS.find(row => row.name === clubName)!;
  const attrs = { pace: 90, shooting: 90, passing: 90, dribbling: 90, defending: 90, physical: 90, reflexes: 90 };
  const state = initCareer(name, 'England', 'ST', '2020-24', attrs, 90, 2020, FALLBACK_CLUBS);
  Object.assign(state, { phase: 'playing', age: 24, overall: 90, contractYearsLeft: 4,
    currentClub: club.name, currentClubCountry: club.country, currentClubTier: club.tier, currentClubColor: club.color, currentLeague: club.league });
  state.seasons.push({ ...state.seasons[0], year, age: 24, club: club.name, clubCountry: club.country, clubTier: club.tier, type: 'playing',
    apps: 40, leagueApps: 32, rating: 7.8, goals: 24 });
  return state;
}

it('settles the verified 2025 event once with replayable annual totals and a personal trophy', () => {
  const random = vi.spyOn(Math, 'random');
  const candidates = Array.from({ length: 25 }, (_, i) => {
    random.mockImplementation(keyedRng('verified club world cup fixture'));
    return advanceProSeason(opening(`Chelsea Cup Fixture ${i}`, 'Chelsea', 2023), FALLBACK_CLUBS, true);
  });
  const career = candidates.find(value => wonClubWorldCup(value.seasons.at(-1)!))!;
  expect(career).toBeDefined();
  const row = career.seasons.at(-1)!;
  const report = readClubWorldCup(row)!;
  expect(report).toMatchObject({ edition: 2025, club: 'Chelsea', group: 'D', champion: 'Chelsea', result: 'Winner' });
  expect(report.matches).toHaveLength(7);
  expect(report.apps).toBeGreaterThan(0);
  const annual = careerOpeningAnnualStats(row)!;
  expect(row.apps).toBe(annual.apps + report.apps);
  expect(row.goals).toBe(annual.goals + report.goals);
  expect(row.assists).toBe(annual.assists + report.assists);
  expect(row.leagueApps).toBeLessThanOrEqual(annual.apps);
  const competitions = savedSeasonCompetitions(career, row);
  expect(competitions.find(competition => competition.id === 'club-world-cup')).toMatchObject({
    group: { label: 'Group D', rows: report.table }, matches: expect.arrayContaining([expect.objectContaining({ round: 'Final', neutral: true })]),
  });
  expect(isSoccerCareerSave(career)).toBe(true);
  expect(readClubWorldCup(repairCareer(JSON.parse(JSON.stringify(career))).seasons.at(-1)!)).toEqual(report);
  expect(getCareerTotals(career.seasons).clubWorldCups).toBe(1);
  random.mockImplementation(keyedRng('verified club world cup fixture'));
  expect(advanceProSeason(opening('No place fixture', 'Arsenal', 2023), FALLBACK_CLUBS, true).seasons.at(-1)!.clubWorldCup).toBeUndefined();
  random.mockImplementation(keyedRng('verified club world cup fixture'));
  expect(advanceProSeason(opening('Later cycle fixture', 'Chelsea', 2027), FALLBACK_CLUBS, true).seasons.at(-1)!.clubWorldCup).toBeUndefined();
});
