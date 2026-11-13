import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DAILY_START, SAVE_KEY, acceptWildernessJob, careerLeagueOf, enterWilderness,
  finishSeason, fixtureFor, leagueRounds, loadCareer,
  playNextEntry, registerCustomClub, registerLeagueOverrides, resumeMatch, saveCareer,
  secondLegContext, sortedLeagueTable, sortedWorldTable, startCareer, startNextSeason,
  type CareerState, type StartCareerOptions, type TableRow,
} from '@/lib/clubManager';
import { dateKey, dateOfEntries, joinClubNow, simToWeek } from '@/lib/clubManagerCalendar';
import { ensureEraRosters } from '@/lib/clubManagerEras';
import { ensureRealLeagueFixtures } from '@/lib/clubManagerFixtures';
import { jobHuntOf } from '@/lib/clubManagerJobHunt';
import { mulberry32 } from '@/lib/leagueCore';
import { saveFence } from '@/lib/saveFence';
import { useClubManager } from '@/hooks/useClubManager';

vi.mock('@/lib/completions', () => ({
  recordCompletion: vi.fn(),
  recordActivity: vi.fn(),
  recordStreakDay: vi.fn(),
}));

const PLAYOFF = { frenchPlayoffs: true } as const;
const QUICK = { skipHalftime: true, noCoach: true } as const;
const LOWER = ['Nantes', 'Saint-Étienne', 'Rodez'] as const;
const TOP = 'Auxerre';

function ranked(names: readonly string[], seeds: readonly string[], place: number, games: number): TableRow[] {
  const ordered = names.filter(name => !seeds.includes(name));
  ordered.splice(place - 1, 0, ...seeds);
  return ordered.map((club, index) => {
    const pts = games * 3 - 5 - 4 * index;
    const w = Math.floor(pts / 3), d = pts % 3;
    return { club, w, d, l: games - w - d, pts, gf: games * 2 - index, ga: index };
  });
}

function beforeLastLeague(club: string, opts: StartCareerOptions = PLAYOFF): CareerState {
  const state = startCareer(club, undefined, undefined, undefined, undefined, undefined, opts);
  const top = careerLeagueOf(state).id === 'ligue1';
  state.table = ranked(state.leagueClubs, top ? [TOP] : LOWER, top ? 16 : 3, 33);
  const other = state.world![top ? 'ligue2' : 'ligue1'];
  other.table = ranked(other.table.map(row => row.club), top ? LOWER : [TOP], top ? 3 : 16, 34);
  for (const world of Object.values(state.world ?? {})) world.round = leagueRounds(world.table.length);
  state.week = state.calendar.findIndex(entry => entry.type === 'league' && entry.round === 33);
  state.boardConfidence = 100;
  return state;
}

function expectPromotion(done: CareerState, winner: string, change: 'up' | 'retain') {
  const oldTop = careerLeagueOf(done).id === 'ligue1' ? done.table : done.world!.ligue1.table;
  const summary = finishSeason(done);
  if (change === 'up') expect(summary.summary.fate).toBe('up');
  const next = startNextSeason(summary.state);
  const top = next.leagueOverrides!.ligue1;
  const lower = next.leagueOverrides!.ligue2;
  expect(top).toContain(winner);
  expect(lower).toContain(change === 'up' ? TOP : done.frenchPlayoffs!.barrage!.home);
  expect(top.filter(club => !oldTop.some(row => row.club === club))).toHaveLength(change === 'up' ? 3 : 2);
  expect(top).toHaveLength(18);
  expect(lower).toHaveLength(18);
  expect(new Set([...top, ...lower]).size).toBe(36);
  expect(careerLeagueOf(next).id).toBe('ligue1');
  expect(next.frenchPlayoffRules).toBe(true);
  expect(next.frenchPlayoffs).toBeUndefined();
}

beforeEach(async () => {
  localStorage.clear();
  saveFence.release(SAVE_KEY);
  registerLeagueOverrides(null);
  registerCustomClub(null);
  vi.spyOn(Math, 'random').mockImplementation(mulberry32(1087));
  await ensureRealLeagueFixtures('ligue2-2026-27-v1');
});

afterEach(() => {
  saveFence.release(SAVE_KEY);
  registerLeagueOverrides(null);
  registerCustomClub(null);
  vi.restoreAllMocks();
});

describe('Ligue 1 and Ligue 2 promotion playoff', () => {
  it.each([
    ['Rodez', 5, 4, 'Saint-Étienne', false, undefined],
    ['Saint-Étienne', 4, 4, 'Rodez', true, undefined],
    ['Nantes', 3, 3, null, true, undefined],
    ['Auxerre', 16, 2, null, false, undefined],
  ] as const)('opens the correct first playable match for %s from place %i',
    (club, position, count, opponent, home, extraTime) => {
      const regular = playNextEntry(beforeLastLeague(club), QUICK).state;
      expect(sortedLeagueTable(regular)[position - 1].club).toBe(club);
      const schedule = regular.calendar.filter(entry => entry.type === 'promotion');
      expect(schedule).toHaveLength(count);
      const next = fixtureFor(regular, schedule[0]);
      expect(next).toMatchObject({ home });
      if (opponent) expect(next?.opponent).toBe(opponent);
      expect(next?.extraTime).toBe(extraTime);
      expect(startNextSeason(regular)).toBe(regular);
      expect(() => finishSeason(regular)).toThrow('The season has fixtures still to play.');
    },
  );

  it('keeps third in Ligue 2 on existing and Daily rules and leaves historic and other nations untouched', async () => {
    const old = playNextEntry(beforeLastLeague('Nantes', {}), QUICK).state;
    expect(old.calendar.filter(entry => entry.type === 'promotion')).toHaveLength(0);
    expect(careerLeagueOf(startNextSeason(old)).id).toBe('ligue2');
    expect(startCareer('Nantes', undefined, undefined, undefined, undefined, undefined,
      { ...PLAYOFF, ...DAILY_START }).frenchPlayoffRules).toBeUndefined();
    await ensureEraRosters('era2010');
    expect(startCareer('Lyon', 'era2010', undefined, undefined, undefined, undefined, PLAYOFF).frenchPlayoffRules).toBeUndefined();
    expect(startCareer('Hamburg', undefined, undefined, undefined, undefined, undefined, PLAYOFF).frenchPlayoffRules).toBeUndefined();
  });

  it('keeps the final regular match and world on their existing random draws while the AI settles the ladder', () => {
    const regular = beforeLastLeague('PSG', {});
    regular.table = ranked(regular.leagueClubs, ['PSG'], 1, 33);
    vi.mocked(Math.random).mockImplementation(mulberry32(3521));
    const old = playNextEntry(regular, QUICK);
    const nextDraw = Math.random();
    vi.mocked(Math.random).mockImplementation(mulberry32(3521));
    const added = playNextEntry({ ...regular, frenchPlayoffRules: true }, QUICK);
    expect(Math.random()).toBe(nextDraw);
    expect(added.state.table).toEqual(old.state.table);
    expect(added.state.world).toEqual(old.state.world);
    expect(added.report).toEqual(old.report);
    expect(added.state.frenchPlayoffs?.barrage?.winner).toBeTruthy();
  });

  it('sends a level Ligue 2 opening round directly to penalties and skips later manager fixtures after elimination', () => {
    vi.mocked(Math.random).mockImplementation(mulberry32(19));
    const regular = playNextEntry(beforeLastLeague('Rodez'), QUICK).state;
    const dates = dateOfEntries(2026, regular.calendar).slice(-5).map(dateKey);
    expect(dates.every((date, index) => index === 0 || date > dates[index - 1])).toBe(true);
    const first = playNextEntry(regular, QUICK);
    expect(first.report?.decidedBy).toBe('pens');
    expect(first.state.frenchPlayoffs?.first).toMatchObject({ winner: 'Saint-Étienne', pens: true });
    expect(first.state.frenchPlayoffs?.first.aet).toBeUndefined();
    expect(first.state.calendar.filter(entry => entry.type === 'promotion')).toHaveLength(1);
    const played = first.state.frenchPlayoffs!;
    expect(played.second).toMatchObject({ home: 'Nantes', away: 'Saint-Étienne' });
    expect(played.barrage?.winner).toBeTruthy();
    expect(played.barrage?.leg1).toBeDefined();
    expect(played.barrage?.leg2).toBeDefined();
  });

  it('plays all four games from fifth, resumes the first leg, and swaps three clubs when the challenger wins', () => {
    let state = playNextEntry(beforeLastLeague('Rodez'), QUICK).state;
    const table = state.table;
    for (const player of state.squad) player.rating = 99;
    for (const rival of [TOP, 'Nantes', 'Saint-Étienne']) state.clubStrengths[rival] = 45;
    const first = playNextEntry(state, QUICK);
    expect(first.state.frenchPlayoffs?.first.winner).toBe('Rodez');
    expect(first.state.frenchPlayoffs?.second).toMatchObject({ home: 'Nantes', away: 'Rodez' });
    const second = playNextEntry(first.state, QUICK);
    expect(second.state.frenchPlayoffs?.second?.winner).toBe('Rodez');
    const pair = second.state.frenchPlayoffs?.barrage;
    expect(pair).toMatchObject({ home: 'Rodez', away: TOP });
    expect(fixtureFor(second.state, second.state.calendar[second.state.week])).toMatchObject({ home: true });
    const halftime = playNextEntry(second.state);
    expect(halftime.kind).toBe('halftime');
    expect(halftime.live?.compLabel).toBe('Ligue 1 barrage · first leg');
    expect(saveCareer(halftime.state)).toBe(true);
    const saved = localStorage.getItem(SAVE_KEY);
    const loaded = loadCareer()!;
    expect(loaded.live).toEqual(halftime.live);
    expect(loaded.frenchPlayoffs).toEqual(halftime.state.frenchPlayoffs);
    expect(localStorage.getItem(SAVE_KEY)).toBe(saved);
    const leg1 = resumeMatch(loaded);
    expect(leg1.report?.tie?.leg).toBe(1);
    expect(fixtureFor(leg1.state, leg1.state.calendar[leg1.state.week])).toMatchObject({ home: false, extraTime: true });
    expect(secondLegContext(leg1.state, leg1.state.week, 0, 0)).toMatchObject({ leg1Home: true, awayGoalsRule: false });
    const leg2 = playNextEntry(leg1.state, QUICK);
    expect(leg2.report?.tie).toMatchObject({ leg: 2, through: true });
    expect(leg2.state.frenchPlayoffs?.barrage?.winner).toBe('Rodez');
    expect(leg2.state.table).toEqual(table);
    expectPromotion(leg2.state, 'Rodez', 'up');
  });

  it('retains Ligue 1 16th through extra time and penalties despite unequal away-goal counts', () => {
    vi.mocked(Math.random).mockImplementation(mulberry32(27));
    const regular = playNextEntry(beforeLastLeague(TOP), QUICK).state;
    const first = resumeMatch(playNextEntry(regular).state);
    const second = playNextEntry(first.state, QUICK);
    expect(second.state.frenchPlayoffs?.barrage).toMatchObject({
      winner: TOP, homeGoals: 4, awayGoals: 4, aet: true, pens: true,
      leg1: { homeGoals: 1, awayGoals: 2 }, leg2: { homeGoals: 3, awayGoals: 2 },
    });
    expect(second.report?.decidedBy).toBe('pens');
    expectPromotion(second.state, TOP, 'retain');
  });

  it('settles a sealed barrage after dismissal, preserving its played first leg', () => {
    const regular = playNextEntry(beforeLastLeague(TOP), QUICK).state;
    const first = playNextEntry(regular, QUICK).state;
    const barrage = first.frenchPlayoffs!.barrage!;
    const lower = barrage.home;
    barrage.leg1 = { homeGoals: 15, awayGoals: 0 };
    first.jobHunt = { ...jobHuntOf(first),
      open: { club: 'Arsenal', league: 'premier', tier: 1, season: 1, week: first.week, matchesLeft: 0, roll: 0, status: 'accepted' } };
    expect(joinClubNow(first)).toBeNull();
    const sacked = enterWilderness({ ...first, sacked: true });
    const recorded = JSON.stringify(sacked);
    const next = acceptWildernessJob(sacked, 'Arsenal');
    expect(next).toMatchObject({ clubName: 'Arsenal', season: 2 });
    expect(next?.leagueOverrides?.ligue1).toContain(lower);
    expect(next?.leagueOverrides?.ligue2).toContain(TOP);
    expect(JSON.stringify(sacked)).toBe(recorded);
  });

  it('settles AI-only playoff stages after both tables finish on a normal 34-round calendar', () => {
    let state = startCareer('PSG', undefined, undefined, undefined, undefined, undefined, PLAYOFF);
    expect(state.calendar.filter(entry => entry.type === 'league')).toHaveLength(34);
    for (let i = 0; i < 100 && state.week < state.calendar.length && !state.frenchPlayoffs; i++) {
      state.boardConfidence = 100;
      state = playNextEntry(state, QUICK).state;
    }
    expect(state.world?.ligue2?.round).toBe(34);
    const lower = sortedWorldTable(state, 'ligue2', state.world!.ligue2.table);
    expect([...state.table, ...lower].every(row => row.w + row.d + row.l === 34)).toBe(true);
    const bracket = state.frenchPlayoffs!;
    expect(bracket.first).toMatchObject({ home: lower[3].club, away: lower[4].club });
    expect(bracket.second).toMatchObject({ home: lower[2].club, away: bracket.first.winner });
    expect(bracket.barrage).toMatchObject({ home: bracket.second!.winner, away: sortedLeagueTable(state)[15].club });
    expect(bracket.barrage?.winner).toBeTruthy();
    expect(state.calendar.some(entry => entry.type === 'promotion')).toBe(false);
  });

  it('reaches a real playoff through game start and calendar fast-forward', async () => {
    const { result } = renderHook(() => useClubManager());
    await waitFor(() => expect(result.current.phase).toBe('clubSelect'));
    act(() => result.current.chooseClub('Nantes'));
    act(() => result.current.confirmClub());
    await waitFor(() => expect(result.current.phase).toBe('hub'));
    expect(result.current.career?.frenchPlayoffRules).toBe(true);
    expect(loadCareer()?.realLeagueFixtures).toBe('ligue2-2026-27-v1');
    const end = beforeLastLeague('Nantes');
    const run = simToWeek(end, end.week + 1);
    expect(run.lastReport?.competition).toBe('league');
    const next = run.state.calendar.slice(run.state.week).find(entry => entry.type === 'promotion')!;
    expect(fixtureFor(run.state, next)).toMatchObject({ home: true, compLabel: 'Ligue 2 playoff · second round' });
    expect(run.state.pendingSummary).toBeNull();
  });
});
