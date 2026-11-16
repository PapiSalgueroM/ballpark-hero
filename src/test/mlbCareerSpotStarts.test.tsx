import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { keyedRng } from '@/lib/keyedRng';
import { MLB_CAREER_SPORT as sport } from '@/lib/mlbCareerSport';
import { MLB_ARCHETYPES, mlbCampBattle, mlbProgress, simMlbSeason, startMlbCareer, type MlbCareerState } from '@/lib/mlbMyCareer';
import {
  prepareUsCareerProgramme, restoreUsCareerProgramme, saveUsCareerProgramme, settleUsCareerProgramme,
  usProgrammeDefaults, usProgrammeMenus, type ProgrammeCareer,
} from '@/lib/usCareerProgramme';
import { deriveSeasonOrWhy, disagreements, soFar } from '@/lib/season/core';
import { MLB_SEASON } from '@/lib/season/mlb';
import { buildUsSeason, type UsRow } from '@/lib/season/us';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));

type Career = MlbCareerState & ProgrammeCareer;
const label = 'Stretch out for spot starts';
const usual = usProgrammeDefaults();
const book = (c: Career) => saveUsCareerProgramme(c, 'mlb', { ...usual, tactics: 'spot-starts' });
const read = () => JSON.parse(localStorage.getItem(sport.saveKey)!).c as Career;

function fixture(year = 2027): Career {
  const career = startMlbCareer(
    'Audition fixture', 'SP', MLB_ARCHETYPES.SP[2], keyedRng('mlb-audition:draft'), null, year === 2027 ? 'now' : 'y2004',
  );
  Object.assign(career, { team: year === 2020 ? 'STL' : 'SEA', year: year - 1, ovr: 68, pot: 82, health: 90, role: 'backup', age: 22 });
  if (year === 2020) Object.assign(career, { ovr: 74, age: 36, salary: 2.5, contractYears: 3 });
  const { line } = simMlbSeason(career, 85, keyedRng('mlb-audition:prior'), true);
  mlbProgress(career, keyedRng('mlb-audition:progress'), line.seasonRating);
  delete career.pendingRivalryEvent;
  delete career.pendingRivalryChoice;
  return career;
}

function play(c: Career, seed: number) {
  const copy = structuredClone(c);
  const source = keyedRng('mlb-audition:' + seed);
  let draws = 0;
  const rng = () => { draws++; return source(); };
  const camp = mlbCampBattle(copy, 85, rng);
  const prep = prepareUsCareerProgramme(copy, 'mlb');
  const { line, notes } = simMlbSeason(copy, 85, rng, true, prep);
  restoreUsCareerProgramme(copy, prep);
  mlbProgress(copy, rng, line.seasonRating);
  const receipt = settleUsCareerProgramme(copy, line, 'mlb', prep);
  return { copy, line, notes, draws, nextDraw: source(), camp, receipt };
}

function expectSameTapeAndDeal(a: ReturnType<typeof play>, b: ReturnType<typeof play>) {
  expect(b.camp).toBe(a.camp);
  expect(b.draws).toBe(a.draws);
  expect(b.nextDraw).toBe(a.nextDraw);
  expect(b.line.seasonRating).toEqual(a.line.seasonRating);
  expect([b.line.teamResult, b.line.poGames, b.line.poLine]).toEqual([a.line.teamResult, a.line.poGames, a.line.poLine]);
  expect([b.copy.salary, b.copy.contractYears, b.copy.earnings, b.copy.netWorth]).toEqual([a.copy.salary, a.copy.contractYears, a.copy.earnings, a.copy.netWorth]);
}

function tactics(view: ReturnType<typeof render>) {
  fireEvent.click(within(view.container).getByRole('button', { name: 'Plan your season' }));
  const dialog = screen.getByRole('dialog', { name: 'MLB season programme' });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Continue to programme' }));
  fireEvent.click(within(dialog).getByRole('button', { name: /Tactical approach/ }));
  return dialog;
}

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe('MLB My Career spot-start plan', () => {
  it('adds measurable starts to the normal 162-game spot duty on the unchanged draws', () => {
    const c = fixture();
    const baseline = play(c, 0);
    const planned = play(book(c), 0);
    expect(baseline.line).toMatchObject({ year: 2027, team: 'SEA', games: 13, so: 77, wins: 7, lossesP: 4, era: 5.37, poLine: '2 appearances, 4.24 ERA, 13 K' });
    expect(planned.line).toMatchObject({ games: 18, so: 100, wins: 9, lossesP: 5, era: 5.37 });
    expect(planned.copy.role).toBe('backup');
    expect(planned.copy.health).toBe(baseline.copy.health);
    expect(planned.copy.programme).toBeUndefined();
    expect(planned.receipt?.decisions).toEqual([{ section: 'tactics', label, outcome: 'completed', actual: 18, unit: 'starts' }]);
    expectSameTapeAndDeal(baseline, planned);

    const row = planned.line as unknown as UsRow;
    const replay = buildUsSeason(MLB_SEASON, planned.copy, row, sport.teamLabelOf);
    if (replay.ok === false) throw new Error(replay.line);
    const season = deriveSeasonOrWhy(replay.sport, row, replay.ctx);
    if (typeof season === 'string') throw new Error(season);
    expect(disagreements(replay.sport, row, replay.ctx, season)).toEqual([]);
    expect(season.games.filter(g => g.played)).toHaveLength(18);
    expect(soFar(season, 162)).toMatchObject({ so: 100, wins: 9 });
  });

  it('loses real starts and existing health when the stretch causes arm fatigue', () => {
    const c = fixture();
    const baseline = play(c, 97);
    const planned = play(book(c), 97);
    expect([baseline.line.games, baseline.line.so, baseline.copy.health]).toEqual([13, 64, 90]);
    expect([planned.line.games, planned.line.so, planned.copy.health]).toEqual([6, 40, 82]);
    expect(planned.notes).toEqual(expect.arrayContaining([expect.stringMatching(/arm fatigue/i)]));
    expect(planned.receipt?.decisions).toEqual([{ section: 'tactics', label, outcome: 'missed', actual: 6, unit: 'starts' }]);
    expectSameTapeAndDeal(baseline, planned);
  });

  it('declines the spot-start plan when camp gives the regular rotation and settles the other choice', () => {
    const c = fixture();
    const baseline = play(saveUsCareerProgramme(c, 'mlb', { ...usual, expectation: 'steady' }), 46);
    const booked = saveUsCareerProgramme(c, 'mlb', { ...usual, tactics: 'spot-starts', expectation: 'steady' });
    const planned = play(booked, 46);
    expect(planned.copy.role).toBe('starter');
    expect(planned.line).toEqual(baseline.line);
    expect(planned.line.games).toBe(32);
    expect(planned.copy.health).toBe(baseline.copy.health);
    expect(planned.notes).toEqual(expect.arrayContaining([expect.stringMatching(/spot-start plan unused.*rotation/i)]));
    expect(planned.receipt?.decisions).toEqual([{ section: 'tactics', label, outcome: 'unused' }, ...baseline.receipt!.decisions]);
    expect(planned.copy.programme).toBeUndefined();
    expectSameTapeAndDeal(baseline, planned);
  });

  it('respects an existing injury and the six-start floor without a second cost', () => {
    const c = fixture();
    const baseline = play(c, 420);
    const planned = play(book(c), 420);
    expect(baseline.line.games).toBe(6);
    expect(planned.line).toEqual(baseline.line);
    expect(planned.copy.health).toBe(82);
    expect(planned.copy.health).toBe(baseline.copy.health);
    expect(planned.receipt?.decisions).toEqual([{ section: 'tactics', label, outcome: 'unused' }]);
    expectSameTapeAndDeal(baseline, planned);
  });

  it.each([
    [2005, 162, 0, 13, 18, 90, 0],
    [2020, 58, 0, 5, 6, 84, 0],
    [2020, 58, 17, 5, 3, 84, 8],
  ])('carries %i to its %i-game schedule with draw %i', (year, slate, seed, baselineGames, starts, baselineHealth, fatigueCost) => {
    const c = fixture(year);
    const baseline = play(c, seed);
    const planned = play(book(c), seed);
    expect(planned.line.slate ?? 162).toBe(slate);
    expect(baseline.line.games).toBe(baselineGames);
    expect(planned.line.games).toBe(starts);
    expect(baseline.copy.health).toBe(baselineHealth);
    expect(planned.copy.health).toBe(baselineHealth - fatigueCost);
    expect(planned.line.wins! + planned.line.lossesP!).toBeLessThanOrEqual(starts);
    expectSameTapeAndDeal(baseline, planned);
    if (slate < 162) {
      expect(buildUsSeason(MLB_SEASON, planned.copy, planned.line as unknown as UsRow, sport.teamLabelOf)).toMatchObject({
        ok: false, line: expect.stringContaining('your club finished on 58 games'),
      });
    }
  });

  it('preserves legacy paths and refuses bookings for other roles, unsigned players and rookies', () => {
    const c = fixture();
    const options = (candidate: Career, slug: 'mlb' | 'nfl' = 'mlb') =>
      usProgrammeMenus(candidate, slug).find(menu => menu.id === 'tactics')!.options.map(option => option.id);
    expect(options(c)).toContain('spot-starts');
    expect(options(c, 'nfl')).not.toContain('spot-starts');
    for (const unavailable of [
      { ...c, role: undefined }, { ...c, role: 'starter' as const }, { ...c, pos: 'RP' as const },
      { ...c, pos: 'SS' as const }, { ...c, seasons: [] }, { ...c, contractYears: 0 },
      { ...c, retired: true }, { ...c, suspendedSeasons: 1 },
    ]) {
      expect(options(unavailable)).not.toContain('spot-starts');
      expect(book(unavailable)).toBe(unavailable);
    }
    const legacy = JSON.parse(JSON.stringify(c)) as Career;
    expect(saveUsCareerProgramme(legacy, 'mlb', usual)).toBe(legacy);
    expect(play(legacy, 0)).toEqual(play(c, 0));
    const programme = book(c).programme!;
    for (const stale of [{ ...programme, team: 'DET' }, { ...programme, year: c.year + 1 }]) {
      const baseline = play(c, 0);
      const planned = play({ ...c, programme: stale }, 0);
      expect(planned.receipt).toBeNull();
      expect(planned.line).toEqual(baseline.line);
      expect(planned.notes).toEqual(baseline.notes);
      expectSameTapeAndDeal(baseline, planned);
    }
  });

  it('saves the real programme selection, reloads it, and settles it exactly once on the MLB board', async () => {
    const { default: MlbMyCareerBoard } = await import('@/components/mlb-my-career/MlbMyCareerBoard');
    const mount = () => render(<MemoryRouter initialEntries={['/mlb-my-career']}><MlbMyCareerBoard /></MemoryRouter>);
    const c = fixture();
    const legacy = JSON.stringify({ c, phase: 'season', teamQuality: 85, coach: null });
    localStorage.setItem(sport.saveKey, legacy);
    let view = mount();
    let dialog = tactics(view);
    const option = within(dialog).getByRole('button', { name: new RegExp(label) });
    expect(option).toHaveAttribute('aria-pressed', 'false');
    expect(option).toHaveTextContent(/injury/i);
    expect(localStorage.getItem(sport.saveKey)).toBe(legacy);
    fireEvent.click(option);
    expect(read().programme).toMatchObject({ tactics: 'spot-starts', sport: 'mlb', team: 'SEA', year: 2027 });
    const savedPlan = localStorage.getItem(sport.saveKey);
    view.unmount();

    view = mount();
    dialog = tactics(view);
    expect(within(dialog).getByRole('button', { name: new RegExp(label) })).toHaveAttribute('aria-pressed', 'true');
    expect(localStorage.getItem(sport.saveKey)).toBe(savedPlan);
    fireEvent.click(dialog.querySelector('[data-us-programme-close]')!);
    vi.spyOn(Math, 'random').mockImplementation(keyedRng('mlb-audition:0'));
    fireEvent.click(within(view.container).getByRole('button', { name: 'Play the 2027 season' }));

    const settled = read();
    expect(settled.programme).toBeUndefined();
    expect(settled.seasons.slice(0, -1)).toEqual(c.seasons);
    expect(settled.seasons.at(-1)).toMatchObject({ year: 2027, games: 18, so: 100, salary: c.salary });
    expect(settled.contractYears).toBe(c.contractYears - 1);
    expect(settled.programmeResults).toMatchObject([{
      year: 2027, team: 'SEA', decisions: [{ section: 'tactics', label, outcome: 'completed', actual: 18, unit: 'starts' }],
    }]);
    const reveal = view.container.querySelector('[data-season-reveal]') as HTMLElement;
    expect(within(reveal).getByText(/spot-start plan.*18 starts/i)).toBeInTheDocument();
    const written = localStorage.getItem(sport.saveKey);
    view.unmount();

    mount();
    expect(localStorage.getItem(sport.saveKey)).toBe(written);
    expect(read()).toEqual(settled);
  });
});
