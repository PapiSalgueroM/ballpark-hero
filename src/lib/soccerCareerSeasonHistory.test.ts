import { describe, expect, it, vi } from 'vitest';
import type { SeasonRecord } from './soccerCareerEngine';
import { compareSavedSeasons, defaultSeasonComparison, savedSeasonAvailability, seasonHistoryRows } from './soccerCareerSeasonHistory';

function season(patch: Partial<SeasonRecord> = {}): SeasonRecord {
  return {
    year: 2020, age: 21, club: 'Saved Club', clubCountry: 'England', clubTier: 1,
    type: 'playing', apps: 30, goals: 12, assists: 9, cleanSheets: 8,
    yellowCards: 4, redCards: 0, rating: 7.3, ovr: 77,
    leagueTitle: false, domesticCup: false, championsLeague: false, worldCup: false,
    ballonDor: false, ballonDorRank: null, intApps: 0, intGoals: 0, intAssists: 0,
    intRating: 0, tournament: null, tournamentResult: null, ...patch,
  };
}
const history = (seasons: SeasonRecord[], position = 'CM') => ({ seasons, position });
const metric = (row: ReturnType<typeof seasonHistoryRows>[number], key: string) => row.metrics.find(value => value.key === key)!;
const invalidCounts: unknown[] = [undefined, null, '8', -1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1];

describe('saved Soccer season choices and comparison', () => {
  it('keeps original indices and duplicate years while retaining interrupted senior rows', () => {
    const input = history([season({ type: 'youth' }), season(), season({ type: 'manager' }), season({ apps: 0, club: 'BANNED' }), season({ type: 'retired' })]);
    const rows = seasonHistoryRows(input);
    expect(rows.map(row => [row.index, row.year])).toEqual([[1, 2020], [3, 2020]]);
    expect(defaultSeasonComparison(rows)).toEqual([1, 3]);
    expect(compareSavedSeasons(input, 1, 3)?.second.availability.zeroAppsReason).toBe('Banned');
    expect(compareSavedSeasons(input, 0, 1)).toBeNull();
  });

  it('offers no comparison until two senior rows exist', () => {
    expect(defaultSeasonComparison(seasonHistoryRows(history([])))).toBeNull();
    expect(defaultSeasonComparison(seasonHistoryRows(history([season(), season({ type: 'youth' })])))).toBeNull();
  });

  it('defaults to the latest two saved rows without sorting or relabeling history', () => {
    const rows = seasonHistoryRows(history([season({ year: 2029 }), season({ year: 2022 }), season({ year: 2022 })]));
    expect(rows.map(row => row.index)).toEqual([0, 1, 2]);
    expect(defaultSeasonComparison(rows)).toEqual([1, 2]);
  });

  it('reads saved metadata and loan parent rather than current club or age', () => {
    const source = { ...history([season({ year: 2015, age: 19, club: 'Past Club', onLoanFrom: 'Saved Parent' })]), currentClub: 'Current Club', age: 35 };
    expect(seasonHistoryRows(source)[0]).toMatchObject({ index: 0, year: 2015, age: 19, club: 'Past Club', onLoanFrom: 'Saved Parent' });
    const invalid = season({ year: NaN, age: -1, club: ' ', onLoanFrom: 4 as unknown as string });
    expect(seasonHistoryRows(history([invalid]))[0]).toMatchObject({ year: null, age: null, club: null, onLoanFrom: null });
  });

  it.each([
    ['GK', ['ovr', 'rating', 'apps', 'cleanSheets']],
    ['CB', ['ovr', 'rating', 'apps', 'cleanSheets', 'goals']],
    ['LB', ['ovr', 'rating', 'apps', 'cleanSheets', 'goals']],
    ['RB', ['ovr', 'rating', 'apps', 'cleanSheets', 'goals']],
    ['CDM', ['ovr', 'rating', 'apps', 'goals', 'assists']],
    ['CM', ['ovr', 'rating', 'apps', 'goals', 'assists']],
    ['CAM', ['ovr', 'rating', 'apps', 'goals', 'assists']],
    ['LW', ['ovr', 'rating', 'apps', 'goals', 'assists']],
    ['RW', ['ovr', 'rating', 'apps', 'goals', 'assists']],
    ['ST', ['ovr', 'rating', 'apps', 'goals', 'assists']],
  ])('uses the existing recorded position stats for %s', (position, keys) => {
    const row = seasonHistoryRows(history([season()], position as string))[0];
    expect(row.metrics.map(value => value.key)).toEqual(keys);
    expect(metric(row, 'apps').value).toBe(30);
  });

  it('reads only saved OVR and never fills an older row from current overall', () => {
    const source = { ...history([season({ ovr: undefined }), season({ ovr: 81 })]), overall: 99 };
    const comparison = compareSavedSeasons(source, 0, 1)!;
    expect(comparison.metrics.find(value => value.key === 'ovr')).toMatchObject({ first: null, second: 81, delta: null });
  });

  it.each(invalidCounts)('does not turn invalid or missing counts %s into zero', value => {
    const row = season({ apps: value as number, goals: value as number, assists: value as number, cleanSheets: value as number });
    const cm = seasonHistoryRows(history([row]))[0];
    expect(['apps', 'goals', 'assists'].map(key => metric(cm, key).value)).toEqual([null, null, null]);
    expect(metric(cm, 'rating').value).toBeNull();
    expect(metric(seasonHistoryRows(history([row], 'GK'))[0], 'cleanSheets').value).toBeNull();
  });

  it('keeps recorded zero stats and leaves a zero-game match rating unavailable', () => {
    const row = seasonHistoryRows(history([season({ apps: 0, goals: 0, assists: 0, rating: 0 })]))[0];
    expect(['apps', 'goals', 'assists'].map(key => metric(row, key).value)).toEqual([0, 0, 0]);
    expect(metric(row, 'rating').value).toBeNull();
  });

  it.each([0, 2.9, 10.1, NaN, Infinity, '7.3'])('rejects unrecordable match rating %s', rating => {
    expect(metric(seasonHistoryRows(history([season({ rating: rating as number })]))[0], 'rating').value).toBeNull();
  });

  it.each([0, 100, 77.5, NaN, Infinity, '77'])('rejects invalid saved OVR %s', ovr => {
    expect(metric(seasonHistoryRows(history([season({ ovr: ovr as number })]))[0], 'ovr').value).toBeNull();
  });

  it.each(['CB', 'LB', 'RB'])('keeps old %s clean sheet uncertainty instead of inventing zero', position => {
    const rows = seasonHistoryRows(history([season({ cleanSheets: 0, ovr: undefined }), season({ cleanSheets: 0 }), season({ cleanSheets: 3, ovr: undefined }), season({ apps: 0, cleanSheets: 0, ovr: undefined })], position));
    expect(rows.map(row => metric(row, 'cleanSheets').value)).toEqual([null, 0, 3, 0]);
    expect(metric(seasonHistoryRows(history([season({ cleanSheets: 0, ovr: undefined })], 'GK'))[0], 'cleanSheets').value).toBe(0);
  });

  it('subtracts the raw first value from the second with neutral positive, negative and reversed changes', () => {
    const input = history([season({ goals: 12, assists: 9, rating: 7.3, ovr: 77 }), season({ goals: 15, assists: 3, rating: 7.4, ovr: 80 })]);
    const forward = compareSavedSeasons(input, 0, 1)!;
    const reverse = compareSavedSeasons(input, 1, 0)!;
    expect(forward.metrics.filter(value => ['goals', 'assists', 'rating', 'ovr'].includes(value.key)).map(value => value.delta)).toEqual([3, 0.1, 3, -6]);
    expect(reverse.metrics.filter(value => ['goals', 'assists', 'rating', 'ovr'].includes(value.key)).map(value => value.delta)).toEqual([-3, -0.1, -3, 6]);
  });

  it('has no numeric delta when either side is unavailable', () => {
    const input = history([season({ ovr: undefined }), season({ rating: NaN })]);
    const comparison = compareSavedSeasons(input, 0, 1)!;
    expect(comparison.metrics.filter(value => ['ovr', 'rating'].includes(value.key)).map(value => value.delta)).toEqual([null, null]);
  });

  it.each([[0, 0], [-1, 0], [0, 2], [0.5, 0], [NaN, 1], [Infinity, 0]])('rejects invalid or same selection %s,%s', (first, second) => {
    expect(compareSavedSeasons(history([season(), season()]), first, second)).toBeNull();
  });

  it('excludes every award and rank even when a pending outcome is already saved', () => {
    const rows = [season({ ballonDor: true, ballonDorRank: 1, leagueTitle: true }), season()];
    const before = compareSavedSeasons(history(rows), 0, 1);
    const changed = rows.map(row => ({ ...row, ballonDor: false, ballonDorRank: 30, leagueTitle: false }));
    expect(compareSavedSeasons(history(changed), 0, 1)).toEqual(before);
    expect(JSON.stringify(before)).not.toMatch(/ballonDor|Rank|leagueTitle|worldCup|awards/);
  });
});

describe('saved season availability', () => {
  it('distinguishes missing injury from an explicit saved absence', () => {
    expect(savedSeasonAvailability(season())).toMatchObject({ injury: null, injuryRecorded: false, injuryWeeks: null, injurySevere: null, suspensionMatches: null });
    expect(savedSeasonAvailability(season({ injury: null, injuryWeeks: 0, injurySevere: false, suspensionMatches: 0 }))).toMatchObject({ injury: null, injuryRecorded: true, injuryWeeks: 0, injurySevere: false, suspensionMatches: 0 });
  });

  it('reports recorded injury weeks and suspension matches without inferring lost games', () => {
    expect(savedSeasonAvailability(season({ injury: 'Saved hamstring injury', injuryWeeks: 12, injurySevere: true, suspensionMatches: 3 }))).toEqual({ apps: 30, injury: 'Saved hamstring injury', injuryRecorded: true, injuryWeeks: 12, injurySevere: true, suspensionMatches: 3, zeroAppsReason: null });
    expect(savedSeasonAvailability(season({ injuryWeeks: 40 })).suspensionMatches).toBeNull();
    expect(savedSeasonAvailability(season({ injuryWeeks: 40 })).apps).toBe(30);
  });

  it.each(invalidCounts)('leaves invalid or missing availability counts %s unavailable', value => {
    expect(savedSeasonAvailability(season({ injuryWeeks: value as number, suspensionMatches: value as number }))).toMatchObject({ injuryWeeks: null, suspensionMatches: null });
  });

  it.each([0, 1, 'false', undefined, null])('does not coerce invalid injury severity %s into a boolean', injurySevere => {
    expect(savedSeasonAvailability(season({ injurySevere: injurySevere as boolean })).injurySevere).toBeNull();
  });

  it('retains saved weeks even when an injury is explicitly absent', () => {
    expect(savedSeasonAvailability(season({ injury: null, injuryWeeks: 4, injurySevere: false, suspensionMatches: 0 }))).toMatchObject({ injury: null, injuryRecorded: true, injuryWeeks: 4, injurySevere: false, suspensionMatches: 0, zeroAppsReason: null });
  });
  it('rejects invalid injury names and severity without inventing a clear bill of health', () => {
    expect(savedSeasonAvailability(season({ injury: ' ', injurySevere: 'false' as unknown as boolean }))).toMatchObject({ injury: null, injuryRecorded: false, injurySevere: null });
  });

  it.each([
    ['BANNED', 'Banned'], ['BANNED (PED)', 'Banned'], ['PRISON', 'Prison'], ['CONVICTED', 'Convicted'],
    ['Saved Club', 'No appearances recorded'], ['toString', 'No appearances recorded'],
  ])('uses only the saved zero-game status for %s', (club, reason) => {
    expect(savedSeasonAvailability(season({ apps: 0, club })).zeroAppsReason).toBe(reason);
  });

  it('describes saved zero-game injury facts without claiming their weeks caused a match loss', () => {
    expect(savedSeasonAvailability(season({ apps: 0, injury: 'Saved injury', injurySevere: true })).zeroAppsReason).toBe('Severe injury recorded');
    expect(savedSeasonAvailability(season({ apps: 0, injury: 'Saved injury' })).zeroAppsReason).toBe('Injury recorded');
    expect(savedSeasonAvailability(season({ apps: 0, injury: null, injurySevere: false, suspensionMatches: 3 })).zeroAppsReason).toBe('No appearances recorded');
  });

  it('keeps the whole input unchanged and consumes no global draw', () => {
    const input = history([Object.freeze(season({ injury: 'Saved injury', injuryWeeks: 8, suspensionMatches: 2 })), Object.freeze(season({ year: 2021 }))]);
    Object.freeze(input.seasons); Object.freeze(input);
    const before = structuredClone(input);
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('A read must not draw'); });
    try {
      const rows = seasonHistoryRows(input);
      defaultSeasonComparison(rows);
      compareSavedSeasons(input, 0, 1);
      savedSeasonAvailability(input.seasons[0]);
      expect(input).toEqual(before);
      expect(random).not.toHaveBeenCalled();
    } finally { random.mockRestore(); }
  });
});
