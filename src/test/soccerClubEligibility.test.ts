import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { clubConfederation, clubCupFor } from '@/lib/soccerCareerContinental';
import { advanceProSeason, calcAppearances, initCareer, projectLeagueApps, simulateUCL, type CareerState, type ClubData, type SeasonRecord } from '@/lib/soccerCareerEngine';
import { isSoccerCareerSave, parseSoccerCareerSave, serializeSoccerCareerSave } from '@/lib/soccerCareerSave';

const club: ClubData = { id: 'policy-fixture', name: 'Policy Fixture FC', country: 'Russia', league: 'Fixture League', color: '#123456', tier: 1 };
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const notIn = { qualified: false, matches: [], result: 'N/A', playerGoals: 0, isTopScorer: false };
const appearance = { apps: 29, leagueApps: 24, injured: false, injuryWeeks: 0, injuryName: null, injurySevere: false };

function fixture(country = 'Russia', lastYear = 2021, tier = 1, nationality = 'England'): CareerState {
  const created = initCareer('Club Policy Fixture', nationality, 'ST', '2020-24',
    { pace: 75, shooting: 75, passing: 75, dribbling: 75, defending: 75, physical: 75, reflexes: 75 },
    75, 2020, [club], null, 90);
  const row: SeasonRecord = { year: lastYear, age: 25, club: club.name, clubCountry: country, clubTier: tier,
    apps: 25, leagueApps: 24, goals: 9, assists: 5, cleanSheets: 0, yellowCards: 2, redCards: 0, rating: 7.2, ovr: 75,
    leagueTitle: false, domesticCup: false, championsLeague: false, worldCup: false, ballonDor: false, ballonDorRank: null, type: 'playing',
    intApps: 0, intGoals: 0, intAssists: 0, intRating: 0, tournament: null, tournamentResult: null };
  const state: CareerState = { ...created, age: 25, currentClub: club.name, currentClubCountry: country, currentClubTier: tier,
    currentClubColor: club.color, currentLeague: club.league, phase: 'playing', contractYearsLeft: 3, weeklyWage: 8000,
    morale: 81, retired: false, loan: null, agentId: 'self', seasons: [row] };
  delete state.phone;
  return state;
}
function run<T>(fn: () => T) {
  const at = vi.mocked(Math.random).mock.calls.length, output = fn();
  return { output, draws: vi.mocked(Math.random).mock.results.slice(at).map(row => row.value) };
}
function cup(state: CareerState) {
  return simulateUCL(state, { ...state.seasons[state.seasons.length - 1], year: state.seasons[state.seasons.length - 1].year + 1 });
}
function raw(name: string, frames: unknown) {
  if (!process.env.SC_CLUB_POLICY_RAW) return;
  mkdirSync(process.env.SC_CLUB_POLICY_RAW, { recursive: true });
  writeFileSync(join(process.env.SC_CLUB_POLICY_RAW, name + '.json'), JSON.stringify({
    case: name, fixture: 'Fictional club and controlled senior records; existing real engine and save codec.',
    frames, randomDraws: vi.mocked(Math.random).mock.results.map(row => row.value),
  }) + '\n');
}
beforeEach(() => { vi.spyOn(Math, 'random').mockReturnValue(0.4); vi.spyOn(Date, 'now').mockReturnValue(1793793600000); });
afterEach(() => vi.restoreAllMocks());

describe('Russian club continental participation policy', () => {
  it('excludes tier one and two Russian clubs from complete seasons starting in 2022 with no cup draw', () => {
    const vectors = [2022, 2025, 2026, 2035].flatMap(year => [1, 2].map(tier => {
      const input = fixture('Russia', year - 1, tier), original = clone(input), selection = run(() => clubCupFor('Russia', year));
      /* The result argument cannot replace the next year derived from the saved history. */
      const result = run(() => simulateUCL(input, { ...input.seasons[0], year: 1999 }));
      return { year, tier, original, input, selection, result };
    }));
    raw('cup-exclusion', vectors);
    expect(vectors.map(row => [row.selection.output, row.selection.draws, row.result.output, row.result.draws]), 'SC_CLUB_POLICY_CUP').toEqual(vectors.map(() => [null, [], notIn, []]));
    for (const row of vectors) expect(row.input).toEqual(row.original);
  });

  it('counts only league and domestic cup appearances at Russian clubs from the exact 2021 row to 2022 season boundary', () => {
    const vectors = [2022, 2025, 2026, 2035].flatMap(year => [1, 2].map(tier => {
      const input = fixture('Russia', year - 1, tier), original = clone(input);
      const band = projectLeagueApps(75, tier, club.name, 1), result = run(() => calcAppearances(75, tier, 25, input));
      return { year, tier, original, input, band, result };
    }));
    raw('appearance-exclusion', vectors);
    /* Both literal projection bands are 20 to 30: draw .4 gives 24 league games.
       With at least 20 league games the unchanged domestic cup draw gives 5, and .4 avoids injury. */
    expect(vectors.map(row => row.result.output), 'SC_CLUB_POLICY_APPS').toEqual(vectors.map(() => appearance));
    for (const row of vectors) {
      expect(row.band).toEqual({ min: 20, max: 30 }); expect(row.result.draws).toEqual([0.4, 0.4, 0.4]); expect(row.input).toEqual(row.original);
    }
  });

  it('preserves Russian club cup selection and complete simulation outputs before the first fully excluded season', () => {
    const vectors = [1990, 2020, 2021].map(year => {
      const input = fixture('Russia', year - 1), english = { ...clone(input), currentClubCountry: 'England' };
      return { year, input, english, selected: clubCupFor('Russia', year), russian: run(() => cup(input)), comparison: run(() => cup(english)) };
    });
    raw('prior-season-cups', vectors);
    for (const row of vectors) {
      expect(row.selected).toEqual({ cup: 'ucl', confederation: 'UEFA', period: null });
      expect(row.russian).toEqual(row.comparison); expect(row.russian.draws.length).toBeGreaterThan(0);
    }
  });

  it('preserves Russian club aggregate appearance outputs and full draw tapes for seasons starting in 2021 and earlier', () => {
    const vectors = [1990, 2020, 2021].flatMap(year => [1, 2].map(tier => {
      const input = fixture('Russia', year - 1, tier), english = { ...clone(input), currentClubCountry: 'England' };
      return { year, tier, input, english, russian: run(() => calcAppearances(75, tier, 25, input)), comparison: run(() => calcAppearances(75, tier, 25, english)) };
    }));
    raw('prior-season-appearances', vectors);
    for (const row of vectors) { expect(row.russian).toEqual(row.comparison); expect(row.russian.output).toEqual({ ...appearance, apps: 37 }); }
  });

  it('uses the employer country rather than Russian player nationality for an English club', () => {
    const input = fixture('England', 2025, 1, 'Russia'), comparison = { ...clone(input), nationality: 'England' };
    const russian = { cup: run(() => cup(input)), appearances: run(() => calcAppearances(75, 1, 25, input)) };
    const english = { cup: run(() => cup(comparison)), appearances: run(() => calcAppearances(75, 1, 25, comparison)) };
    raw('nationality-preserved', { input, comparison, russian, english });
    expect(russian).toEqual(english); expect(russian.cup.output.qualified).toBe(true); expect(russian.appearances.output.apps).toBe(37);
  });

  it('keeps UEFA affiliation and existing club cup choices for the other confederations', () => {
    const countries = ['England', 'Brazil', 'Mexico', 'Japan', 'Egypt', 'New Zealand'];
    const vectors = countries.map(country => {
      const input = fixture(country, 2025);
      return { country, input, confederation: clubConfederation(country), selection: run(() => clubCupFor(country, 2026)),
        simulation: run(() => cup(input)), appearances: run(() => calcAppearances(75, 1, 25, input)) };
    });
    const affiliation = run(() => clubConfederation('Russia'));
    raw('other-countries', { vectors, affiliation });
    expect(affiliation).toEqual({ output: 'UEFA', draws: [] });
    expect(vectors.map(row => row.selection.output?.cup ?? null)).toEqual(['ucl', 'libertadores', 'concacaf', 'afc', 'caf', null]);
    expect(vectors.map(row => row.selection.draws)).toEqual(countries.map(() => []));
    expect(vectors.map(row => row.simulation.output.qualified)).toEqual([true, true, true, true, true, false]);
    for (const row of vectors) expect(row.appearances.output).toEqual({ ...appearance, apps: 37 });
  });

  it('preserves appearance behavior without state or without a saved employer country', () => {
    const vectors = [1, 2].map(tier => {
      const input = fixture('England', 2025, tier); Object.assign(input, { currentClubCountry: undefined });
      return { tier, input, absentState: run(() => calcAppearances(75, tier, 25)), absentCountry: run(() => calcAppearances(75, tier, 25, input)) };
    });
    raw('missing-context', vectors);
    for (const row of vectors) {
      expect(row.absentState).toEqual(row.absentCountry); expect(row.absentState.output).toEqual({ ...appearance, apps: 37 });
      expect(row.absentState.draws).toEqual(Array(row.tier === 1 ? 6 : 7).fill(0.4));
    }
  });

  it('leaves exact nonmatching country strings and all pure-export inputs untouched', () => {
    const vectors = ['russia', ' Russia', 'Russia ', 'England'].map(country => {
      const input = fixture(country, 2025), original = clone(input);
      return { country, original, input, selected: run(() => clubCupFor(country, 2026)), cup: run(() => cup(input)), appearances: run(() => calcAppearances(75, 1, 25, input)) };
    });
    raw('exact-country-and-purity', vectors);
    for (const row of vectors) {
      expect(row.selected.output?.cup).toBe('ucl'); expect(row.cup.output.qualified).toBe(true);
      expect(row.appearances.output.apps).toBe(37); expect(row.input).toEqual(row.original);
    }
  });

  it('round trips already recorded Russian seasons and their continental receipts without rewriting history', () => {
    const historical = fixture('Russia', 2020), result = run(() => cup(historical)), input = fixture('Russia', 2026);
    input.seasons = [2021, 2022, 2026].map(year => ({ ...clone(input.seasons[0]), year, clubCupRun: clone(result.output), championsLeague: result.output.result === 'Winner' }));
    const original = clone(input), serialized = serializeSoccerCareerSave(input), reloaded = parseSoccerCareerSave(serialized) as CareerState;
    raw('recorded-history-codec', { historical, result, original, input, serialized, reloaded });
    expect(isSoccerCareerSave(reloaded)).toBe(true); expect(reloaded).toEqual(original); expect(input).toEqual(original);
    expect(reloaded.seasons.map(row => row.clubCupRun)).toEqual(input.seasons.map(row => row.clubCupRun));
  });

  it('records the actual newly played 2022 season without a named continental cup and reloads the complete career', () => {
    const input = fixture('Russia', 2021), original = clone(input), result = run(() => advanceProSeason(input, [club]));
    const output = result.output, row = output.seasons[output.seasons.length - 1], serialized = serializeSoccerCareerSave(output);
    const reloaded = parseSoccerCareerSave(serialized) as CareerState;
    raw('advanced-season-codec', { original, inputAfter: input, result, row, serialized, reloaded });
    expect([row.year, row.clubCountry, row.clubCupRun, row.clubCupTitle, row.championsLeague, output.lastUCLResult?.qualified], 'SC_CLUB_POLICY_SEASON').toEqual([2022, 'Russia', undefined, undefined, false, false]);
    expect(isSoccerCareerSave(reloaded)).toBe(true); expect(reloaded).toEqual(clone(output)); expect(output.seasons.slice(0, -1)).toEqual(original.seasons);
  });
});
