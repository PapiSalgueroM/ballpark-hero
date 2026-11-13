import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DAILY_START, SAVE_KEY, acceptWildernessJob, careerLeagueOf, enterWilderness, finishSeason, fixtureFor, leagueRounds, loadCareer,
  playNextEntry, registerCustomClub, registerLeagueOverrides, resumeMatch, saveCareer,
  secondLegContext, sortedLeagueTable, sortedWorldTable, startCareer, startNextSeason,
  type CareerState, type StartCareerOptions, type TableRow,
} from '@/lib/clubManager';
import { dateKey, dateOfEntries, joinClubNow } from '@/lib/clubManagerCalendar';
import { ensureEraRosters } from '@/lib/clubManagerEras';
import { ensureRealLeagueFixtures, realLeagueFixtureKeyFor } from '@/lib/clubManagerFixtures';
import { jobHuntOf } from '@/lib/clubManagerJobHunt';
import { mulberry32 } from '@/lib/leagueCore';
import { saveFence } from '@/lib/saveFence';
import { useClubManager } from '@/hooks/useClubManager';

vi.mock('@/lib/completions', () => ({
  recordCompletion: vi.fn(),
  recordActivity: vi.fn(),
  recordStreakDay: vi.fn(),
}));

const PLAYOFF = { bundesligaPlayoff: true } as const;
const QUICK = { skipHalftime: true, noCoach: true } as const;

function ranked(names: readonly string[], club: string, place: number, complete: boolean): TableRow[] {
  const ordered = names.filter(name => name !== club);
  ordered.splice(place - 1, 0, club);
  const games = leagueRounds(ordered.length) - Number(!complete);
  return ordered.map((name, index) => {
    const pts = 3 * games - 5 - 4 * index;
    const w = Math.floor(pts / 3);
    const d = pts % 3;
    return { club: name, w, d, l: games - w - d, gf: games * 2 - index, ga: index, pts };
  });
}

function beforeLastLeague(club: 'Hamburg' | 'Hertha BSC', opts: StartCareerOptions = PLAYOFF): CareerState {
  const state = startCareer(club, undefined, undefined, undefined, undefined, undefined, opts);
  const top = club === 'Hamburg';
  state.table = ranked(state.leagueClubs, club, top ? 16 : 3, false);
  for (const world of Object.values(state.world ?? {})) world.round = leagueRounds(world.table.length);
  const other = state.world![top ? 'bundesliga2' : 'bundesliga'];
  other.table = ranked(other.table.map(row => row.club), top ? 'Hertha BSC' : 'Hamburg', top ? 3 : 16, true);
  state.week = state.calendar.findIndex(entry => entry.type === 'league' && entry.round === 33);
  return state;
}

beforeEach(async () => {
  localStorage.clear();
  saveFence.release(SAVE_KEY);
  registerLeagueOverrides(null);
  registerCustomClub(null);
  vi.spyOn(Math, 'random').mockImplementation(mulberry32(1087));
  await Promise.all(['bundesliga', 'bundesliga2'].map(league => ensureRealLeagueFixtures(realLeagueFixtureKeyFor(league, 2026))));
});

afterEach(() => {
  saveFence.release(SAVE_KEY);
  registerLeagueOverrides(null);
  registerCustomClub(null);
  vi.restoreAllMocks();
});

describe('Bundesliga promotion and relegation playoff', () => {
  it.each([['Hamburg', 16, true], ['Hertha BSC', 3, false]] as const)(
    'schedules %s from position %i in both playoff legs',
    (club, position, firstHome) => {
      const regular = playNextEntry(beforeLastLeague(club), QUICK).state;
      expect(sortedLeagueTable(regular)[position - 1].club).toBe(club);
      const fixtures = regular.calendar.filter(entry => entry.type === 'promotion');
      expect(fixtures.map(entry => fixtureFor(regular, entry)?.home)).toEqual([firstHome, !firstHome]);
      expect(fixtures.map(entry => fixtureFor(regular, entry)?.extraTime)).toEqual([undefined, true]);
      const dates = dateOfEntries(2026, regular.calendar).slice(-3).map(dateKey);
      expect(dates[0]).toBeLessThan(dates[1]);
      expect(dates[1]).toBeLessThan(dates[2]);
      expect(startNextSeason(regular)).toBe(regular);
      expect(() => finishSeason(regular)).toThrow('The season has fixtures still to play.');
    },
  );

  it('leaves the original two-club exchange on existing saves and keeps Daily and historic starts untouched', async () => {
    const regular = playNextEntry(beforeLastLeague('Hertha BSC', {}), QUICK).state;
    expect(regular.calendar.some(entry => entry.type === 'promotion')).toBe(false);
    expect(careerLeagueOf(startNextSeason(regular)).id).toBe('bundesliga2');
    expect(startCareer('Hamburg', undefined, undefined, undefined, undefined, undefined,
      { ...DAILY_START, ...PLAYOFF }).bundesligaPlayoffRules).toBeUndefined();
    await ensureEraRosters('era2010');
    expect(startCareer('Hamburg', 'era2010', undefined, undefined, undefined, undefined,
      PLAYOFF).bundesligaPlayoffRules).toBeUndefined();
  });

  it('keeps the final regular league match and the wider world on the same random draws', () => {
    const legacy = beforeLastLeague('Hertha BSC', {});
    vi.mocked(Math.random).mockImplementation(mulberry32(442));
    const old = playNextEntry(legacy, QUICK);
    const oldNextDraw = Math.random();
    vi.mocked(Math.random).mockImplementation(mulberry32(442));
    const added = playNextEntry({ ...legacy, bundesligaPlayoffRules: true }, QUICK);
    expect(Math.random()).toBe(oldNextDraw);
    expect(added.state.table).toEqual(old.state.table);
    expect(added.state.world).toEqual(old.state.world);
    const { events, ...report } = added.report!;
    expect({ ...report, events: events.slice(0, -1) }).toEqual(old.report);
  });

  it.each([['Hertha BSC', 3, 13, 'Hertha BSC', 'pens'], ['Hamburg', 16, 1087, 'Hamburg', 'regular']] as const)(
    'resumes both playable legs for %s and moves only the required clubs after the result',
    (club, position, seed, winner, decider) => {
      vi.mocked(Math.random).mockImplementation(mulberry32(seed));
      const regular = playNextEntry(beforeLastLeague(club), QUICK).state;
      const table = JSON.stringify(regular.table);
      const halftime = playNextEntry(regular);
      expect(halftime.kind).toBe('halftime');
      expect(halftime.live?.compLabel).toContain('Bundesliga playoff');
      expect(saveCareer(halftime.state)).toBe(true);
      const raw = localStorage.getItem(SAVE_KEY);
      const reopened = loadCareer()!;
      expect(reopened.live).toEqual(halftime.live);
      expect(reopened.bundesligaPlayoff).toEqual(regular.bundesligaPlayoff);
      expect(localStorage.getItem(SAVE_KEY)).toBe(raw);

      const first = resumeMatch(reopened);
      expect(first.report?.tie?.leg).toBe(1);
      expect(first.state.bundesligaPlayoff?.tie.winner).toBeNull();
      expect(startNextSeason(first.state)).toBe(first.state);
      expect(secondLegContext(first.state, first.state.week, 0, 0)).toMatchObject({
        leg1Mine: first.report?.tie?.aggMine, leg1Theirs: first.report?.tie?.aggTheirs,
        leg1Home: club === 'Hamburg', awayGoalsRule: false,
      });
      const second = playNextEntry(first.state, QUICK);
      expect(second.report?.tie?.leg).toBe(2);
      expect(second.report?.decidedBy).toBe(decider);
      const tie = second.state.bundesligaPlayoff!.tie;
      expect(tie.winner).toBe(winner);
      if (decider === 'pens') {
        expect(tie).toMatchObject({
          aet: true, pens: true, homeGoals: 2, awayGoals: 2,
          leg1: { homeGoals: 0, awayGoals: 1 }, leg2: { homeGoals: 2, awayGoals: 1 },
        });
      }
      expect(JSON.stringify(second.state.table)).toBe(table);
      const done = finishSeason(second.state);
      expect(done.summary.position).toBe(position);
      if (winner === 'Hertha BSC') expect(done.summary.fate).toBe('up');
      const next = startNextSeason(done.state);
      expect(next.leagueOverrides?.bundesliga).toContain(winner);
      expect(next.leagueOverrides?.bundesliga2).toContain(winner === 'Hamburg' ? 'Hertha BSC' : 'Hamburg');
      const oldTop = club === 'Hamburg' ? regular.table : regular.world!.bundesliga.table;
      expect(next.leagueOverrides?.bundesliga.filter(name => !oldTop.some(row => row.club === name))).toHaveLength(winner === 'Hamburg' ? 2 : 3);
      expect(careerLeagueOf(next).id).toBe('bundesliga');
      expect(next.leagueOverrides?.bundesliga).toHaveLength(18);
      expect(next.leagueOverrides?.bundesliga2).toHaveLength(18);
      expect(new Set([...next.leagueOverrides!.bundesliga, ...next.leagueOverrides!.bundesliga2]).size).toBe(36);
      expect(next.bundesligaPlayoff).toBeUndefined();
      expect(next.bundesligaPlayoffRules).toBe(true);
    },
  );

  it('holds an accepted immediate appointment so the calendar cannot discard the playoff', () => {
    const regular = playNextEntry(beforeLastLeague('Hertha BSC'), QUICK).state;
    regular.jobHunt = {
      ...jobHuntOf(regular),
      open: { club: 'Hamburg', league: 'bundesliga', tier: 1, season: 1, week: regular.week, matchesLeft: 0, roll: 0, status: 'accepted' },
    };
    expect(joinClubNow(regular)).toBeNull();
  });

  it('settles the remaining leg if the manager is dismissed before the summer appointment', () => {
    const regular = playNextEntry(beforeLastLeague('Hertha BSC'), QUICK).state;
    const first = playNextEntry(regular, QUICK).state;
    const tie = first.bundesligaPlayoff!.tie;
    expect(tie.leg1).toBeDefined();
    // A decisive recorded lead makes it observable whether the AI used the first leg.
    tie.leg1 = { homeGoals: 0, awayGoals: 15 };
    first.jobHunt = {
      ...jobHuntOf(first),
      open: { club: 'Arsenal', league: 'premier', tier: 1, season: 1, week: first.week, matchesLeft: 0, roll: 0, status: 'accepted' },
    };
    const sacked = enterWilderness({ ...first, sacked: true });
    const snapshot = JSON.stringify(sacked);
    const next = acceptWildernessJob(sacked, 'Arsenal');
    expect(next).toMatchObject({ clubName: 'Arsenal', season: 2, bundesligaPlayoffRules: true });
    expect(next?.leagueOverrides?.bundesliga).toContain('Hertha BSC');
    expect(next?.leagueOverrides?.bundesliga2).toContain('Hamburg');
    expect(JSON.stringify(sacked)).toBe(snapshot);
  });

  it('enables the playoff for a new current German save through the game hook', async () => {
    const { result } = renderHook(() => useClubManager());
    await waitFor(() => expect(result.current.phase).toBe('clubSelect'));
    act(() => result.current.chooseClub('Hertha BSC'));
    act(() => result.current.confirmClub());
    await waitFor(() => expect(result.current.phase).toBe('hub'));
    expect(result.current.career?.bundesligaPlayoffRules).toBe(true);
    expect(result.current.career?.championshipPlayoffRules).toBeUndefined();
    expect(loadCareer()?.bundesligaPlayoffRules).toBe(true);
  });

  it('completes both real-fixture divisions and settles the AI tie on an ordinary calendar', () => {
    let state = startCareer('Bayern Munich', undefined, undefined, undefined, undefined, undefined, PLAYOFF);
    expect(state.realLeagueFixtures).toBe('bundesliga-2026-27-v1');
    expect(state.calendar.filter(entry => entry.type === 'league')).toHaveLength(34);
    for (let i = 0; state.week < state.calendar.length && !state.bundesligaPlayoff && i < 100; i++) {
      state.boardConfidence = 100;
      state = playNextEntry(state, QUICK).state;
    }
    expect(state.world?.bundesliga2?.round).toBe(34);
    expect(state.table.every(row => row.w + row.d + row.l === 34)).toBe(true);
    const secondRows = sortedWorldTable(state, 'bundesliga2', state.world!.bundesliga2.table);
    expect(secondRows.every(row => row.w + row.d + row.l === 34)).toBe(true);
    const tie = state.bundesligaPlayoff?.tie;
    expect(tie).toMatchObject({ home: sortedLeagueTable(state)[15].club, away: secondRows[2].club, legs: 2 });
    expect([tie?.home, tie?.away]).toContain(tie?.winner);
    expect(tie?.leg1).toBeDefined();
    expect(tie?.leg2).toBeDefined();
    expect(state.calendar.some(entry => entry.type === 'promotion')).toBe(false);
  });
});
