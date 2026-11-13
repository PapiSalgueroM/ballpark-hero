import { afterEach, expect, it, vi } from 'vitest';
import { simulateUCL, type CareerState, type SeasonRecord } from './soccerCareerEngine';
import { simulateTournament, tournamentForYear, type PlayerForm, type SquadCall } from './soccerInternational';

function seedRandom(seed: number) {
  return () => {
    seed = Math.imul(seed, 1664525) + 1013904223 | 0;
    return (seed >>> 0) / 4294967296;
  };
}

const career = (currentClub: string, currentClubCountry: string, year: number, overall: number, position: CareerState['position']) =>
  ({ currentClub, currentClubCountry, currentClubTier: 1, overall, position, seasons: [{ year: year - 1 }] }) as CareerState;

const squad: SquadCall = {
  called: true, role: 'Starter', reason: '', myRank: 1, poolSize: 6, places: 6, myScore: 80, cutScore: 75,
};
const seeds = Array.from({ length: 160 }, (_, i) => 45_103 + i * 10_007);

afterEach(() => vi.restoreAllMocks());

it('credits zero goals to a striker in a scoreless European Cup leg without changing the team draw', () => {
  let draws = 0;
  const random = seedRandom(45_103);
  vi.spyOn(Math, 'random').mockImplementation(() => { draws++; return random(); });
  const cup = simulateUCL(career('Real Madrid', 'Spain', 1960, 65, 'ST'), {} as SeasonRecord);
  expect(cup.matches[0]).toMatchObject({ round: 'QF', leg: 1, goalsFor: 0, goalsAgainst: 0, playerGoals: 0 });
  expect(draws).toBe(10);
  expect(Math.random()).toBe(0.1846428168937564);
});

it.each([
  ['Real Madrid', 'Spain', 2002],
  ['Ajax', 'Netherlands', 2026],
] as const)('lets elite strikers at %s challenge for ten goals without making it routine', (club, country, year) => {
  const random = vi.spyOn(Math, 'random');
  const sample = (position: 'RW' | 'ST') => {
    const state = career(club, country, year, 95, position);
    let goals = 0, appearances = 0, doubleDigits = 0;
    for (const seed of seeds) {
      random.mockImplementation(seedRandom(seed));
      const cup = simulateUCL(state, {} as SeasonRecord);
      const matches = [...cup.matches, ...(cup.firstStage?.stages.flatMap(stage => stage.games) ?? [])];
      expect(matches.every(match => match.playerGoals >= 0 && match.playerGoals <= match.goalsFor)).toBe(true);
      expect(matches.reduce((total, match) => total + match.playerGoals, 0)).toBe(cup.playerGoals);
      goals += cup.playerGoals;
      appearances += matches.length;
      doubleDigits += Number(cup.playerGoals >= 10);
    }
    return { rate: goals / appearances, doubleDigits };
  };
  const winger = sample('RW');
  const striker = sample('ST');
  expect(winger.rate).toBeGreaterThan(0.28);
  expect(striker.rate).toBeGreaterThan(winger.rate);
  expect(striker.doubleDigits / seeds.length).toBeGreaterThan(0.05);
  expect(striker.doubleDigits / seeds.length).toBeLessThan(0.40);
});

it.each([
  ['Brazil', 2002, 'CONMEBOL', 28],
  ['France', 2026, 'UEFA', 20],
  ['Spain', 2024, 'UEFA', 34],
] as const)('keeps international scoring attainable without routine Golden Boots for %s in %i', (nation, year, confederation, age) => {
  const format = tournamentForYear(nation, year)!;
  const qualifying = { confederation, table: [], myPosition: 1, through: 1, qualified: true, automatic: true };
  const random = vi.spyOn(Math, 'random');
  const sample = (overall: number, position: PlayerForm['position']) => {
    const form = { overall, position, age, lastRating: 7.2, lastGoals: 16, isCaptain: false };
    let goals = 0, appearances = 0, boots = 0;
    for (const seed of seeds) {
      random.mockImplementation(seedRandom(seed));
      const cup = simulateTournament(nation, format, year, qualifying, squad, form);
      expect(cup.matches.every(match => match.playerGoals + match.playerAssists <= (match.home === nation ? match.homeGoals : match.awayGoals))).toBe(true);
      goals += cup.playerGoals;
      appearances += cup.playerApps;
      boots += Number(cup.goldenBoot);
    }
    return { rate: goals / appearances, boots };
  };
  const winger = sample(80, 'RW');
  const striker = sample(95, 'ST');
  expect(winger.rate).toBeLessThan(0.60);
  expect(striker.rate).toBeGreaterThan(winger.rate);
  expect(striker.rate).toBeLessThan(0.95);
  expect(striker.boots).toBeGreaterThan(0);
  expect(striker.boots / seeds.length).toBeLessThan(0.40);
});
