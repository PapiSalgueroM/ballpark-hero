import { afterEach, expect, it, vi } from 'vitest';
import { advanceProSeason, FALLBACK_CLUBS, initCareer, simulateUCL, type CareerState, type SeasonRecord } from './soccerCareerEngine';
import { simulateTournament, tournamentForYear, type PlayerForm, type SquadCall } from './soccerInternational';
import { rngFrom } from './careerEngine';

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
const seeds = Array.from({ length: 720 }, (_, i) => 3_519_711 + i * 190_013);

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
      random.mockImplementation(rngFrom(seed));
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
      random.mockImplementation(rngFrom(seed));
      const cup = simulateTournament(nation, format, year, qualifying, squad, form);
      expect(cup.matches.every(match => match.playerGoals + match.playerAssists <= (match.home === nation ? match.homeGoals : match.awayGoals))).toBe(true);
      expect(cup.goldenBoot).toBe(cup.playerGoals > cup.leadingRivalGoals!);
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
  expect(striker.rate).toBeLessThan(0.72);
  expect(striker.boots).toBeGreaterThan(0);
  expect(striker.boots / seeds.length).toBeLessThan(0.14);
});

it('keeps the same international bracket and restricts tournament minutes for a reserve', () => {
  const nation = 'Spain', year = 2024;
  const format = tournamentForYear(nation, year)!;
  const qualifying = { confederation: 'UEFA' as const, table: [], myPosition: 1, through: 1, qualified: true, automatic: true };
  const form = { overall: 82, position: 'ST', age: 21, lastRating: 7.2, lastGoals: 13, isCaptain: false };
  const random = vi.spyOn(Math, 'random');
  let starts = 0, reserveApps = 0, starterGoals = 0, reserveGoals = 0;
  for (const seed of seeds.slice(0, 240)) {
    random.mockImplementation(rngFrom(seed));
    const first = simulateTournament(nation, format, year, qualifying, squad, form);
    random.mockImplementation(rngFrom(seed));
    const reserve = simulateTournament(nation, format, year, qualifying, { ...squad, role: 'Squad player', myRank: 5 }, form);
    expect(reserve.bracket).toEqual(first.bracket);
    expect(reserve.groupTable).toEqual(first.groupTable);
    expect(reserve.matches.every(match => first.matches.some(full => full.home === match.home && full.away === match.away && full.round === match.round))).toBe(true);
    starts += first.playerApps;
    reserveApps += reserve.playerApps;
    starterGoals += first.playerGoals;
    reserveGoals += reserve.playerGoals;
  }
  expect(reserveApps / starts).toBeGreaterThan(0.35);
  expect(reserveApps / starts).toBeLessThan(0.65);
  expect(reserveGoals / reserveApps).toBeLessThan(0.65 * starterGoals / starts);
});

it('only records an international debut after the season produces a cap', () => {
  const club = 'Real Madrid', country = 'Spain', year = 2025;
  const random = vi.spyOn(Math, 'random');
  const season = (overall: number) => {
    const attributes = { pace: overall, shooting: overall, passing: overall, dribbling: overall, defending: overall, physical: overall, reflexes: overall };
    random.mockImplementation(rngFrom(3_519_711));
    const fresh = initCareer('Synthetic Career', country, 'ST', 'modern', attributes, overall, year - 1, FALLBACK_CLUBS, null, 99, null, null, club);
    Object.assign(fresh, { ...career(club, country, year, overall, 'ST'), ...attributes,
      currentLeague: 'La Liga', phase: 'playing', age: 21, contractYearsLeft: 3, internationalCareer: false,
      seasons: [{ ...fresh.seasons[0], type: 'playing', year: year - 1, age: 21, club, clubCountry: country, clubTier: 1, apps: 38, leagueApps: 34, goals: 11, assists: 8, ovr: overall, rating: 6.9 }],
    });
    return advanceProSeason(fresh, FALLBACK_CLUBS);
  };
  const leftOut = season(73);
  expect(leftOut.seasons.at(-1)?.year).toBe(year);
  expect(leftOut.intStats.caps).toBe(0);
  expect(leftOut.intStats.debutYear).toBeNull();
  expect(leftOut.internationalCareer).toBe(false);
  const selected = season(90);
  expect(selected.intStats.caps).toBeGreaterThan(0);
  expect(selected.intStats.caps).toBeLessThanOrEqual(4);
  expect(selected.intStats.debutYear).toBe(year);
});

it('lets exceptional sustained scoring help in Europe without making the title routine', () => {
  const state = career('Real Madrid', 'Spain', 2026, 98, 'ST');
  const profile = { type: 'playing', year: 2026, club: 'Real Madrid', apps: 38, leagueApps: 34, ovr: 98, rating: 8.2 } as SeasonRecord;
  const random = vi.spyOn(Math, 'random');
  let strongTen = 0, ordinaryTen = 0, strongTitles = 0, ordinaryTitles = 0, observedStages = 0;
  for (const seed of seeds) {
    random.mockImplementation(rngFrom(seed));
    const strong = simulateUCL(state, { ...profile, goals: 42 });
    random.mockImplementation(rngFrom(seed));
    const ordinary = simulateUCL(state, { ...profile, goals: 20 });
    expect(strong.qualified).toBe(ordinary.qualified);
    expect(strong.firstStage?.stages.map(stage => [stage.myRow, stage.table]))
      .toEqual(ordinary.firstStage?.stages.map(stage => [stage.myRow, stage.table]));
    observedStages += strong.firstStage?.stages.length ?? 0;
    strongTen += Number(strong.playerGoals >= 10);
    ordinaryTen += Number(ordinary.playerGoals >= 10);
    strongTitles += Number(strong.result === 'Winner');
    ordinaryTitles += Number(ordinary.result === 'Winner');
  }
  expect(observedStages).toBeGreaterThan(0);
  expect((strongTen - ordinaryTen) / seeds.length).toBeGreaterThan(0.12);
  expect(strongTen / seeds.length).toBeLessThan(0.48);
  expect((strongTitles - ordinaryTitles) / seeds.length).toBeGreaterThan(0.015);
  expect(strongTitles / seeds.length).toBeLessThan(0.35);
});

it('lets an exceptional scoring run win the European Golden Boot after a group exit', () => {
  vi.spyOn(Math, 'random').mockImplementation(rngFrom(94_345_925));
  const state = career('Real Madrid', 'Spain', 1992, 98, 'ST');
  const profile = { type: 'playing', year: 1992, club: 'Real Madrid', apps: 38, leagueApps: 34, ovr: 98, rating: 8.2, goals: 42 } as SeasonRecord;
  const cup = simulateUCL(state, profile);

  expect(cup).toMatchObject({ result: 'Group Stage', playerGoals: 9, leadingRivalGoals: 6, isTopScorer: true });
});

it('decides the modern European Golden Boot on the rival tally and keeps it rare', () => {
  const state = career('Real Madrid', 'Spain', 2026, 98, 'ST');
  const profile = { type: 'playing', year: 2026, club: 'Real Madrid', apps: 38, leagueApps: 34, ovr: 98, rating: 8.2, goals: 42 } as SeasonRecord;
  const random = vi.spyOn(Math, 'random');
  let awards = 0, strongRuns = 0, strongAwards = 0, ties = 0;
  for (const seed of seeds) {
    random.mockImplementation(rngFrom(seed));
    const cup = simulateUCL(state, profile);
    if (!cup.qualified) continue;
    expect(Number.isInteger(cup.leadingRivalGoals)).toBe(true);
    expect(cup.isTopScorer).toBe(cup.playerGoals > cup.leadingRivalGoals!);
    awards += Number(cup.isTopScorer);
    ties += Number(cup.playerGoals === cup.leadingRivalGoals);
    if (cup.playerGoals < 12) continue;
    strongRuns++;
    strongAwards += Number(cup.isTopScorer);
  }
  expect(ties).toBeGreaterThan(0);
  expect(strongRuns).toBeGreaterThan(150);
  expect(strongAwards / strongRuns).toBeGreaterThan(0.5);
  expect(awards / seeds.length).toBeLessThan(0.25);
});
