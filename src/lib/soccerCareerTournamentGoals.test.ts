import { afterEach, expect, it, vi } from 'vitest';
import { simulateUCL, type CareerState, type SeasonRecord } from './soccerCareerEngine';
import { simulateTournament, tournamentForYear, type PlayerForm, type SquadCall } from './soccerInternational';

const year = 2002;
const nation = 'Brazil';
const format = tournamentForYear(nation, year)!;
const qualifying = {
  confederation: 'CONMEBOL' as const, table: [], myPosition: 1, through: 1, qualified: true, automatic: true,
};
const squad: SquadCall = {
  called: true, role: 'Starter', reason: '', myRank: 1, poolSize: 6, places: 6, myScore: 80, cutScore: 75,
};

function seeded(initial: number) {
  let seed = initial;
  return () => {
    seed = Math.imul(seed, 1664525) + 1013904223 | 0;
    return (seed >>> 0) / 4294967296;
  };
}

function sample(overall: number, position: CareerState['position']) {
  const career = {
    currentClub: 'Real Madrid', currentClubTier: 1, currentClubCountry: 'Spain',
    overall, position, seasons: [{ year: year - 1 }],
  } as CareerState;
  const form: PlayerForm = { overall, position, age: 28, lastRating: 7.2, lastGoals: 16, isCaptain: false };
  const random = vi.spyOn(Math, 'random');
  let clubGoals = 0, clubApps = 0, internationalGoals = 0, internationalApps = 0;
  let internationalBoots = 0, doubleDigitClubRuns = 0, invalidClubMatches = 0, extraTimeScorers = 0;
  for (let seed = 0; seed < 400; seed++) {
    const key = 45_103 + seed * 10_007;
    random.mockImplementation(seeded(key));
    const club = simulateUCL(career, {} as SeasonRecord);
    const matches = [...club.matches, ...(club.firstStage?.stages.flatMap(stage => stage.games) ?? [])];
    clubGoals += club.playerGoals;
    clubApps += matches.length;
    doubleDigitClubRuns += Number(club.playerGoals >= 10);
    invalidClubMatches += matches.filter(match => match.playerGoals > match.goalsFor).length;
    extraTimeScorers += club.matches.filter(match =>
      match.etFor && match.goalsFor === match.etFor && match.playerGoals > 0).length;
    random.mockImplementation(seeded(key));
    const international = simulateTournament(nation, format, year, qualifying, squad, form);
    internationalGoals += international.playerGoals;
    internationalApps += international.playerApps;
    internationalBoots += Number(international.goldenBoot);
  }
  return {
    clubRate: clubGoals / clubApps, internationalRate: internationalGoals / internationalApps,
    internationalBoots, doubleDigitClubRuns, invalidClubMatches, extraTimeScorers,
  };
}

afterEach(() => vi.restoreAllMocks());

it('keeps an 80 OVR winger below the old international scoring rate', () => {
  const winger = sample(80, 'RW');
  expect(winger.internationalRate).toBeLessThan(0.65);
  expect(winger.invalidClubMatches).toBe(0);
});

it('keeps international awards attainable for an elite winger', () => {
  const winger = sample(95, 'RW');
  expect(winger.internationalRate).toBeLessThan(1.05);
  expect(winger.internationalBoots).toBeGreaterThan(0);
  expect(winger.internationalBoots).toBeLessThan(160);
});

it('credits elite club finishers a larger share of the actual score', () => {
  const winger = sample(95, 'RW');
  const striker = sample(95, 'ST');
  expect(winger.clubRate).toBeGreaterThan(0.4);
  expect(striker.clubRate).toBeGreaterThan(winger.clubRate);
  expect(striker.doubleDigitClubRuns).toBeGreaterThan(20);
  expect(striker.invalidClubMatches).toBe(0);
  expect(striker.extraTimeScorers).toBeGreaterThan(0);
});
