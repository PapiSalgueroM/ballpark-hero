import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { calcAppearances, calcOverall, careerBuildEffects, initCareer, projectLeagueApps, type CareerState, type ClubData, type SeasonRecord } from '@/lib/soccerCareerEngine';

const club: ClubData = { id: 'appearance-total-fixture', name: 'Appearance Total Fixture FC',
  country: 'Russia', league: 'Fixture League', tier: 2, color: '#123456' };
/* Six outfield families total450, so the real overall calculation gives75.
   Low physical ability makes the actual buildEffects availability multiplier hit its legal.89 floor. */
const stats = { pace: 85, shooting: 85, passing: 85, dribbling: 85, defending: 85, physical: 25, reflexes: 75 };
const tape = [0.99, 0, 0.9, 0.9, 0, 0, 0.9];
/* Both old and suspended paths hit a minor four-week injury on their own consumed prefix. */
const injuryTape = [0.99, 0, 0.1, 0.9, 0, 0.9, 0.1, 0.9, 0, 0.9];
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function fixture(country: string): CareerState {
  const initial = initCareer('Appearance Total Fixture', 'England', 'ST', '2020-24', stats,
    calcOverall(stats, 'ST'), 2020, [{ ...club, country, tier: 1 }], null, 90);
  const row: SeasonRecord = { ...initial.seasons[0], year: 2021, age: 25, club: club.name, clubCountry: country,
    clubTier: 2, type: 'playing', apps: 25, leagueApps: 24, goals: 9, assists: 5, rating: 7.2 };
  const state: CareerState = { ...initial, age: 25, currentClub: club.name, currentClubCountry: country,
    currentClubTier: 2, currentLeague: club.league, currentClubColor: club.color,
    morale: 81, phase: 'playing', retired: false, loan: null, seasons: [row] };
  delete state.phone;
  return state;
}
function run(input: CareerState, values: number[] = tape) {
  const before = clone(input), effects = careerBuildEffects(input);
  let cursor = 0;
  vi.mocked(Math.random).mockImplementation(() => values[cursor++ % values.length]);
  const at = vi.mocked(Math.random).mock.calls.length;
  const output = calcAppearances(input.overall, input.currentClubTier, input.age, input, effects);
  return { before, inputAfter: clone(input), effects, output,
    draws: vi.mocked(Math.random).mock.results.slice(at).map(row => row.value) };
}
beforeEach(() => {
  vi.spyOn(Math, 'random').mockReturnValue(0.4);
  vi.spyOn(Date, 'now').mockReturnValue(1793793600000);
});
afterEach(() => vi.restoreAllMocks());

describe('Club league appearances fit the complete appearance total', () => {
  it('keeps healthy and minor-injury Russian seasons within their total while preserving the complete English result and draw tape', () => {
    /* Construct all inputs before any action so the changed Russian draw count cannot alter the comparison fixture. */
    const russianInput = fixture('Russia'), englishInput = fixture('England'), injuredInput = fixture('Russia');
    const russia = run(russianInput), england = run(englishInput), russiaInjured = run(injuredInput, injuryTape);
    const evidence = { fixture: 'Fictional club, constructor-owned player, real overall and real build effects; the saved2021row leads to2022.',
      russia, england, russiaInjured, plannedTape: tape, plannedInjuryTape: injuryTape, randomDraws: vi.mocked(Math.random).mock.results.map(row => row.value) };
    if (process.env.SC_CLUB_TOTALS_RAW) {
      mkdirSync(process.env.SC_CLUB_TOTALS_RAW, { recursive: true });
      writeFileSync(join(process.env.SC_CLUB_TOTALS_RAW, 'appearance-total-invariant.json'), JSON.stringify(evidence) + '\n');
    }
    expect(calcOverall(stats, 'ST')).toBe(75);
    expect([russia.effects.appsMult, england.effects.appsMult, russiaInjured.effects.appsMult], 'SC_CLUB_TOTALS_REAL_BUILD').toEqual([0.89, 0.89, 0.89]);
    expect(projectLeagueApps(75, 2, club.name, 1)).toEqual({ min: 20, max: 30 });
    expect(england.output, 'SC_CLUB_TOTALS_ENGLAND').toEqual({
      apps: 36, leagueApps: 30, injured: false, injuryWeeks: 0, injuryName: null, injurySevere: false,
    });
    expect(england.draws).toEqual(tape);
    expect(russia.output.injured).toBe(false);
    expect(russia.output.leagueApps, 'SC_CLUB_TOTALS_WITHIN_ALL_APPS').toBeLessThanOrEqual(russia.output.apps);
    expect([russiaInjured.output.injured, russiaInjured.output.injurySevere, russiaInjured.output.injuryWeeks], 'SC_CLUB_TOTALS_MINOR_INJURY_REAL').toEqual([true, false, 4]);
    expect(russiaInjured.output.leagueApps, 'SC_CLUB_TOTALS_AFTER_INJURY').toBeLessThanOrEqual(russiaInjured.output.apps);
    expect(russia.inputAfter).toEqual(russia.before); expect(england.inputAfter).toEqual(england.before); expect(russiaInjured.inputAfter).toEqual(russiaInjured.before);
  });
});
