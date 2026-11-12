import { expect, it } from 'vitest';
import { mulberry32 } from '@/lib/leagueCore';
import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
import { mlbCampBattle, mlbLineOnSlate, mlbStatLineFor, simMlbSeason, type MlbSeasonLine } from '@/lib/mlbMyCareer';
import { driveCareer } from './helpers/usCareerDrive';

it.each([
  { games: 6, wins: 5, lossesP: 1, so: 45 },
  { games: 32, wins: 16, lossesP: 8, so: 185 },
])('fits starter decisions to $games starts with the original four draws', ({ games, ...stats }) => {
  const rolls = [0.5, 0.99, 0.99, 0.5];
  let draws = 0;
  const full: MlbSeasonLine = {
    year: 2026, team: 'MIN', age: 25, ovr: 80, games, awards: [], teamResult: 'Missed October', salary: 2,
    ...mlbStatLineFor({ form: 80, pos: 'SP', kind: 'flame', games }, () => rolls[draws++]),
  };
  expect(mlbLineOnSlate(full, 162)).toMatchObject({ games, era: 4.65, ...stats });
  expect(draws).toBe(4);
});

it('fits the scaled record even when each individual rounded stat is valid', () => {
  const full: MlbSeasonLine = {
    year: 2020, team: 'TEX', age: 25, ovr: 85, games: 12, awards: [], teamResult: 'Missed October',
    salary: 2, slate: 60, wins: 7, lossesP: 5, era: 2.45, so: 70,
  };
  expect(mlbLineOnSlate(full, 162)).toBe(full);
  expect(mlbLineOnSlate(full, 60)).toEqual({ ...full, games: 4, wins: 3, lossesP: 1, so: 26 });
  expect(mlbLineOnSlate({ ...full, wins: 5 }, 60)).toEqual({ ...full, games: 4, wins: 2, lossesP: 2, so: 26 });
  expect(full.lossesP).toBe(5);
});

it.each([
  { eraId: 'now', seasons: 3, draft: 2, seed: 13, year: 2029, games: 6, wins: 5, lossesP: 1, era: 4.19, so: 56 },
  { eraId: 'y2004', seasons: 16, draft: 42, seed: 4, year: 2020, games: 2, wins: 2, lossesP: 0, era: 4.5, so: 16 },
  { eraId: 'y2004', seasons: 16, draft: 42, seed: 408, year: 2020, games: 3, wins: 2, lossesP: 1, era: 4.57, so: 21 },
])('saves a feasible $year record in the season loop', ({ eraId, seasons, draft, seed, ...stats }) => {
  const { json } = driveCareer(MLB_CAREER_SPORT, { key: `start-decisions-${draft}`, pos: 'SP', arch: 0, eraId, seasons });
  const career = JSON.parse(json);
  const rng = mulberry32(seed);
  mlbCampBattle(career, 82, rng);
  const { line, notes } = simMlbSeason(career, 82, rng);
  expect(notes.some(note => /Season shortened|Injured list/.test(note))).toBe(true);
  expect(career.seasons.at(-1)).toBe(line);
  expect(line).toMatchObject(stats);
});
