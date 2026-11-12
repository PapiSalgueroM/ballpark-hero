import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DAILY_START, SAVE_KEY, careerLeagueOf, finishSeason, fixtureFor, leagueRounds, loadCareer,
  playNextEntry, registerCustomClub, registerLeagueOverrides, resumeMatch, saveCareer,
  sortedLeagueTable, startCareer, startNextSeason, type CareerState, type TableRow,
} from '@/lib/clubManager';
import { dateKey, dateOfEntries, joinClubNow, simToWeek } from '@/lib/clubManagerCalendar';
import { jobHuntOf } from '@/lib/clubManagerJobHunt';
import { drawNextPlayoffRound, openChampionshipPlayoffs, promotionWinner } from '@/lib/clubManagerChampionshipPlayoffs';
import { saveFence } from '@/lib/saveFence';
import { mulberry32 } from '@/lib/leagueCore';
import { useClubManager } from '@/hooks/useClubManager';

vi.mock('@/lib/completions', () => ({
  recordCompletion: vi.fn(),
  recordActivity: vi.fn(),
  recordStreakDay: vi.fn(),
}));

const PLAYOFFS = { championshipPlayoffs: true, severeMatchInjuries: true } as const;
const OLD = { severeMatchInjuries: true } as const;

function ranked(names: readonly string[], complete: boolean): TableRow[] {
  const games = leagueRounds(names.length) - Number(!complete);
  return names.map((club, index) => {
    const pts = 3 * games - 5 - 4 * index;
    const w = Math.floor(pts / 3);
    const d = pts % 3;
    return { club, w, d, l: games - w - d, gf: games * 2 - index, ga: index, pts };
  });
}

function beforeLastLeague(place: number, opts = OLD, club = 'Burnley'): CareerState {
  const state = startCareer(club, undefined, undefined, undefined, undefined, undefined, opts);
  const names = state.leagueClubs.filter(name => name !== club);
  names.splice(place - 1, 0, club);
  state.table = ranked(names, false);
  for (const world of Object.values(state.world ?? {})) {
    world.table = ranked(world.table.map(row => row.club), true);
    world.round = leagueRounds(world.table.length);
  }
  state.week = state.calendar.findIndex(entry => entry.type === 'league' && entry.round === leagueRounds(names.length) - 1);
  return state;
}

beforeEach(() => {
  localStorage.clear();
  saveFence.release(SAVE_KEY);
  registerLeagueOverrides(null);
  registerCustomClub(null);
  vi.spyOn(Math, 'random').mockImplementation(mulberry32(1087));
});

afterEach(() => {
  saveFence.release(SAVE_KEY);
  registerLeagueOverrides(null);
  registerCustomClub(null);
  vi.restoreAllMocks();
});

describe('modern Championship playoffs', () => {
  it('keeps third place in the Championship until a promotion playoff winner is known', () => {
    const regular = playNextEntry(beforeLastLeague(3, PLAYOFFS), { skipHalftime: true, noCoach: true }).state;
    expect(sortedLeagueTable(regular)[2].club).toBe('Burnley');
    expect(startNextSeason(regular)).toBe(regular);
    expect(regular.pendingSummary).toBeNull();
    expect(regular.week).toBeLessThan(regular.calendar.length);
    expect(() => finishSeason(regular)).toThrow('The season has fixtures still to play.');
    expect(regular.calendar.slice(-3).map(entry => [entry.type, entry.round])).toEqual([['promotion', 1], ['promotion', 2], ['promotion', 3]]);
  });

  it('retains the old top-three exchange without the opt-in', () => {
    const regular = playNextEntry(beforeLastLeague(3), { skipHalftime: true, noCoach: true }).state;
    expect(sortedLeagueTable(regular)[2].club).toBe('Burnley');
    expect(careerLeagueOf(startNextSeason(regular)).id).toBe('premier');
  });

  it('sets the verified eliminator hosts and reseeds third against the lowest winner', () => {
    const seeds = ['Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth'];
    const playoffs = openChampionshipPlayoffs(1, seeds);
    expect(playoffs.ties.map(tie => [tie.home, tie.away])).toEqual([['Fifth', 'Eighth'], ['Sixth', 'Seventh']]);
    playoffs.ties[0].winner = 'Eighth';
    drawNextPlayoffRound(playoffs, 0);
    expect(playoffs.ties).toHaveLength(2);
    playoffs.ties[1].winner = 'Sixth';
    drawNextPlayoffRound(playoffs, 0);
    drawNextPlayoffRound(playoffs, 0);
    expect(playoffs.ties.filter(tie => tie.stage === 'semi').map(tie => [tie.home, tie.away]))
      .toEqual([['Eighth', 'Third'], ['Sixth', 'Fourth']]);
  });

  it('places playoff dates after all already scheduled league and cup nights', () => {
    const existing = [{ type: 'league' }, { type: 'uclKo' }, { type: 'uel' }, { type: 'uel' }];
    const calendar = [...existing, ...Array.from({ length: 4 }, () => ({ type: 'promotion' }))];
    const dates = dateOfEntries(2026, calendar);
    expect(dates.slice(0, existing.length)).toEqual(dateOfEntries(2026, existing));
    expect(dates.slice(existing.length).every((date, i) => dateKey(date) > dateKey(dates[i + existing.length - 1]))).toBe(true);
  });

  it('plays the two actual legs, holds halftime through storage, and grades once the bracket has a winner', () => {
    const regular = playNextEntry(beforeLastLeague(3, PLAYOFFS), { skipHalftime: true, noCoach: true }).state;
    const fixtures = regular.calendar.filter(entry => entry.type === 'promotion');
    expect(fixtures.map(entry => fixtureFor(regular, entry)?.home)).toEqual([false, true, undefined]);

    const stopped = playNextEntry(regular);
    expect(stopped.kind).toBe('halftime');
    expect(stopped.live?.compLabel).toContain('semi-final');
    expect(saveCareer(stopped.state)).toBe(true);
    const raw = localStorage.getItem(SAVE_KEY);
    const loaded = loadCareer()!;
    expect(loaded.championshipPlayoffs).toEqual(stopped.state.championshipPlayoffs);
    expect(loaded.live).toEqual(stopped.live);
    expect(localStorage.getItem(SAVE_KEY)).toBe(raw);

    const first = resumeMatch(loaded);
    expect(first.report?.tie?.leg).toBe(1);
    expect(first.state.championshipPlayoffs?.ties.filter(tie => tie.stage === 'semi' && tie.leg1 && !tie.winner)).toHaveLength(2);
    expect(startNextSeason(first.state)).toBe(first.state);
    const second = playNextEntry(first.state, { skipHalftime: true, noCoach: true });
    expect(second.report?.tie?.leg).toBe(2);
    expect(second.report?.tie?.leg1Mine).toBe(first.report?.tie?.aggMine);
    expect(second.report?.tie).toMatchObject({ aggMine: 2, aggTheirs: 2, through: true });
    expect(second.report?.decidedBy).toBe('pens');
    expect(fixtureFor(second.state, second.state.calendar[second.state.week])?.home).toBeNull();
    const done = playNextEntry(second.state, { skipHalftime: true, noCoach: true }).state;
    expect(done.week).toBe(done.calendar.length);
    expect(promotionWinner(done.championshipPlayoffs)).toBe('QPR');
    const summary = finishSeason(done);
    expect(summary.summary.position).toBe(3);
    const next = startNextSeason(summary.state);
    expect(careerLeagueOf(next).id).toBe('championship');
    expect(next.championshipPlayoffs).toBeUndefined();
    expect(next.championshipPlayoffRules).toBe(true);
  });

  it('opens a sixth-place home eliminator via the date fast-forward path', () => {
    const input = beforeLastLeague(6, PLAYOFFS);
    const lastLeague = input.week;
    const regular = simToWeek(input, lastLeague + 1);
    expect(regular.halt).toBeNull();
    expect(regular.lastReport?.competition).toBe('league');
    expect(regular.state.week).toBe(lastLeague + 1);
    expect(regular.state.calendar.filter(entry => entry.type === 'promotion')).toHaveLength(4);
    const eliminator = regular.state.calendar.findIndex(entry => entry.type === 'promotion');
    expect(fixtureFor(regular.state, regular.state.calendar[eliminator])).toMatchObject({ home: true, extraTime: true });
    const result = simToWeek(regular.state, eliminator + 1);
    expect(result.lastReport?.competition).toBe('promotion');
    expect(result.lastReport?.tie).toBeUndefined();
    expect(result.state.championshipPlayoffs?.ties.filter(tie => tie.stage === 'eliminator' && tie.winner)).toHaveLength(2);
  });

  it('uses the actual AI bracket for a Premier League manager and exchanges exactly three clubs', () => {
    const regular = playNextEntry(beforeLastLeague(20, PLAYOFFS, 'Arsenal'), { skipHalftime: true, noCoach: true }).state;
    expect(regular.calendar.some(entry => entry.type === 'promotion')).toBe(false);
    const fixture = regular.championshipPlayoffs!;
    expect(fixture.ties).toHaveLength(5);
    const winner = promotionWinner(fixture)!;
    expect(fixture.seeds).toContain(winner);
    const done = playNextEntry(regular, { skipHalftime: true, noCoach: true });
    expect(done.kind).toBe('seasonOver');
    expect(done.state.championshipPlayoffs).toEqual(fixture);
    const next = startNextSeason(finishSeason(done.state).state);
    expect(next.leagueOverrides?.premier).toContain(winner);
    expect(next.leagueOverrides?.premier).toHaveLength(20);
    expect(next.leagueOverrides?.championship).toHaveLength(24);
    expect(careerLeagueOf(next).id).toBe('championship');
    expect(next.leagueOverrides?.championship).not.toContain(winner);
  });

  it.each([2, 9])('keeps position %i on the normal no-playoff calendar', place => {
    const regular = playNextEntry(beforeLastLeague(place, PLAYOFFS), { skipHalftime: true, noCoach: true }).state;
    expect(sortedLeagueTable(regular).findIndex(row => row.club === 'Burnley') + 1).toBe(place);
    expect(regular.calendar.some(entry => entry.type === 'promotion')).toBe(false);
    expect(promotionWinner(regular.championshipPlayoffs)).toBeTruthy();
    const next = startNextSeason(regular);
    expect(careerLeagueOf(next).id).toBe(place === 2 ? 'premier' : 'championship');
  });

  it('keeps the opt-in out of Daily and non-English starts', () => {
    expect(startCareer('Burnley', undefined, undefined, undefined, undefined, undefined,
      { ...DAILY_START, ...PLAYOFFS }).championshipPlayoffRules).toBeUndefined();
    expect(startCareer('Real Madrid', undefined, undefined, undefined, undefined, undefined,
      PLAYOFFS).championshipPlayoffRules).toBeUndefined();
  });
  it('promotes the eighth seed only after it wins all three rounds and its neutral final', () => {
    vi.mocked(Math.random).mockImplementation(mulberry32(100));
    let state = playNextEntry(beforeLastLeague(8, PLAYOFFS), { skipHalftime: true, noCoach: true }).state;
    const finalLeagueTable = JSON.stringify(state.table);
    const scores: [number, number][] = [];
    for (let round = 0; round < 4; round++) {
      const match = playNextEntry(state, { skipHalftime: true, noCoach: true });
      expect(match.kind).toBe('match');
      expect(match.report?.competition).toBe('promotion');
      scores.push([match.report!.homeGoals, match.report!.awayGoals]);
      state = match.state;
    }
    expect(scores).toEqual([[2, 3], [2, 0], [4, 3], [2, 1]]);
    expect(JSON.stringify(state.table)).toBe(finalLeagueTable);
    expect(state.week).toBe(state.calendar.length);
    expect(promotionWinner(state.championshipPlayoffs)).toBe('Burnley');
    const done = finishSeason(state);
    expect(done.summary).toMatchObject({ position: 8, fate: 'up' });
    expect(careerLeagueOf(startNextSeason(done.state)).id).toBe('premier');
  });

  it('fast-forwards a loss to review after the AI has settled the remaining ties', () => {
    vi.mocked(Math.random).mockImplementation(mulberry32(91));
    const state = playNextEntry(beforeLastLeague(8, PLAYOFFS), { skipHalftime: true, noCoach: true }).state;
    const run = simToWeek(state, state.calendar.length);
    expect(run.halt).toBe('seasonOver');
    expect(run.lastReport?.competition).toBe('promotion');
    expect(run.state.calendar.filter(entry => entry.type === 'promotion')).toHaveLength(1);
    expect(promotionWinner(run.state.championshipPlayoffs)).toBeTruthy();
    expect(finishSeason(run.state).summary.position).toBe(8);
  });

  it('keeps the sealed field when an immediate job appointment would replay the regular season', () => {
    const state = playNextEntry(beforeLastLeague(3, PLAYOFFS), { skipHalftime: true, noCoach: true }).state;
    state.jobHunt = {
      ...jobHuntOf(state),
      open: { club: 'Arsenal', league: 'premier', tier: 1, season: 1, week: state.week, matchesLeft: 0, roll: 0, status: 'accepted' },
    };
    const held = JSON.stringify(state);
    expect(joinClubNow(state)).toBeNull();
    expect(JSON.stringify(state)).toBe(held);
  });

  it('keeps the regular-final Continue action on the hub with playoff matches still to play', async () => {
    expect(saveCareer(beforeLastLeague(3, PLAYOFFS))).toBe(true);
    const { result } = renderHook(() => useClubManager());
    await waitFor(() => expect(result.current.career?.clubName).toBe('Burnley'));
    await act(async () => { result.current.quickPlay(); });
    await waitFor(() => expect(result.current.phase).toBe('matchResult'));
    expect(result.current.report?.competition).toBe('league');
    act(() => { result.current.continueFromReport(); });
    expect(result.current.phase).toBe('hub');
    expect(result.current.career?.pendingSummary).toBeNull();
    expect(result.current.career?.championshipPlayoffs?.seeds[0]).toBe('Burnley');
  });
});
