import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NflMyCareerBoard from '@/components/nfl-my-career/NflMyCareerBoard';
import { keyedRng } from '@/lib/keyedRng';
import { NFL_CAREER_SPORT as sport } from '@/lib/nflCareerSport';
import { ARCHETYPES, nflCampBattle, progress, simSeason, startCareer, type CareerState } from '@/lib/nflMyCareer';
import { deriveSeasonOrWhy, disagreements, soFar } from '@/lib/season/core';
import { NFL_SEASON } from '@/lib/season/nfl';
import { buildUsSeason, type UsRow } from '@/lib/season/us';
import {
  prepareUsCareerProgramme, restoreUsCareerProgramme, saveUsCareerProgramme, settleUsCareerProgramme,
  usProgrammeDefaults, usProgrammeMenus, type ProgrammeCareer,
} from '@/lib/usCareerProgramme';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));

type Career = CareerState & ProgrammeCareer;
const inside = (c: Career) => saveUsCareerProgramme(c, 'nfl', { ...usProgrammeDefaults(), tactics: 'inside' });
const mount = () => render(<MemoryRouter initialEntries={['/nfl-my-career']}><NflMyCareerBoard /></MemoryRouter>);
const read = () => JSON.parse(localStorage.getItem(sport.saveKey)!).c as Career;
const slates = [
  { era: 'now', year: 2027, games: 17, rec: 110, yards: 1507, insideRec: 123 },
  { era: 'y2005', year: 2006, games: 16, rec: 105, yards: 1439, insideRec: 118 },
] as const;

function fixture(era: 'now' | 'y2005' = 'now'): Career {
  const c = startCareer('Inside Fixture Receiver', 'WR', ARCHETYPES.WR[0], keyedRng('inside routes:' + era), null, era);
  c.team = 'KC';
  c.role = 'starter';
  const { line } = simSeason(c, 76, () => 0.8);
  progress(c, keyedRng('first receiver winter'), line.seasonRating);
  delete c.pendingRivalryEvent;
  delete c.pendingRivalryChoice;
  return { ...c, role: 'starter', ovr: 86, pot: 94, morale: 74, health: 100, contractYears: 3 };
}

function play(c: Career, quality = 86) {
  let draws = 0;
  const rng = () => { draws++; return 0.8; };
  const copy = structuredClone(c);
  const camp = nflCampBattle(copy, quality, rng);
  const prep = prepareUsCareerProgramme(copy, 'nfl');
  const { line, notes } = simSeason(copy, quality, rng, true, prep);
  restoreUsCareerProgramme(copy, prep);
  progress(copy, rng, line.seasonRating);
  const receipt = settleUsCareerProgramme(copy, line, 'nfl', prep);
  return { line, notes, draws, copy, camp, receipt };
}

function tactics(view: ReturnType<typeof mount>) {
  fireEvent.click(within(view.container).getByRole('button', { name: 'Plan your season' }));
  const dialog = screen.getByRole('dialog', { name: 'NFL season programme' });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Continue to programme' }));
  fireEvent.click(within(dialog).getByRole('button', { name: /Tactical approach/ }));
  return dialog;
}

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe('NFL Inside routes', () => {
  it.each(slates)('trades touchdowns and depth for actual receptions on the $games-game slate', ({ era, year, games, rec, yards, insideRec }) => {
    const c = fixture(era);
    const usual = play(c);
    const planned = play(inside(c));
    expect(usual.line).toMatchObject({ year, games, rec, recYds: yards, recTd: 12, teamResult: 'Lost in the Wild Card round', poGames: 1, poLine: '6 rec, 66 yds' });
    expect(planned.line).toMatchObject({ year, games, rec: insideRec, recYds: yards, recTd: 11 });
    expect(planned.camp).toEqual(usual.camp);
    expect(planned.line.teamResult).toBe(usual.line.teamResult);
    expect(planned.line.poGames).toBe(usual.line.poGames);
    expect(planned.line.poLine).toBe(usual.line.poLine);
    expect(planned.line.seasonRating).toEqual(usual.line.seasonRating);
    expect(planned.copy.health).toBe(usual.copy.health);
    expect(planned.draws).toBe(usual.draws);
    expect(planned.receipt?.decisions).toEqual([{ section: 'tactics', label: 'Inside routes', outcome: 'completed', actual: insideRec - rec, unit: 'additional receptions' }]);
    expect(planned.copy.programme).toBeUndefined();

    const row = planned.line as unknown as UsRow;
    const replay = buildUsSeason(NFL_SEASON, planned.copy, row, sport.teamLabelOf);
    if (games === 16) {
      expect(replay).toMatchObject({ ok: false, line: expect.stringContaining('the week by week view is built for 17') });
      return;
    }
    if (replay.ok === false) throw new Error(replay.line);
    const season = deriveSeasonOrWhy(replay.sport, row, replay.ctx);
    if (typeof season === 'string') throw new Error(season);
    expect(disagreements(replay.sport, row, replay.ctx, season)).toEqual([]);
    expect(soFar(season, games)).toMatchObject({ rec: insideRec, recYds: yards, recTd: 11 });
  });

  it('leaves the capped line and draw stream intact and settles the plan on an expiring deal', () => {
    const c = { ...fixture(), ovr: 99, pot: 99, morale: 100, contractYears: 1 };
    const usual = play(c, 100);
    const planned = play(inside(c), 100);
    expect(usual.line.rec).toBe(145);
    expect(planned.line).toEqual(usual.line);
    expect(planned.draws).toBe(usual.draws);
    expect(planned.copy.contractYears).toBe(0);
    expect(planned.receipt?.decisions).toEqual([{ section: 'tactics', label: 'Inside routes', outcome: 'unused' }]);
    expect(planned.notes).toContain('Inside routes unused. You were already at the 145-reception cap.');
    expect(planned.copy.programme).toBeUndefined();
  });

  it('leaves a demoted receiver on the regular backup sim and does not drop the rest of the programme', () => {
    const c = { ...fixture(), ovr: 65 };
    const usualPlan = { ...usProgrammeDefaults(), expectation: 'steady' } as const;
    const usual = play(saveUsCareerProgramme(c, 'nfl', usualPlan), 96);
    const planned = play(saveUsCareerProgramme(c, 'nfl', { ...usualPlan, tactics: 'inside' }), 96);
    expect(usual.camp).toContain('Benched.');
    expect(planned.camp).toBe(usual.camp);
    expect(planned.copy.role).toBe('backup');
    expect(planned.line).toEqual(usual.line);
    expect(planned.draws).toBe(usual.draws);
    expect(planned.receipt?.decisions).toEqual([
      { section: 'tactics', label: 'Inside routes', outcome: 'unused' }, ...usual.receipt!.decisions,
    ]);
    expect(planned.notes).toContain('Inside routes unused. Camp moved you to the backup role.');
  });

  it('only offers Inside routes to signed starting wide receivers', () => {
    const c = fixture();
    const options = (career: Career, slug: 'nfl' | 'nba' = 'nfl') =>
      usProgrammeMenus(career, slug).find(m => m.id === 'tactics')!.options.map(o => o.id);
    expect(options(c)).toContain('inside');
    expect(options(c, 'nba')).not.toContain('inside');
    for (const unavailable of [{ ...c, role: 'backup' as const }, { ...c, pos: 'TE' as const },
      { ...c, contractYears: 0 }, { ...c, retired: true }, { ...c, suspendedSeasons: 1 }]) {
      expect(options(unavailable)).not.toContain('inside');
      expect(inside(unavailable)).toBe(unavailable);
    }
  });

  it('books, reloads, plays and saves the receipt through the real shortened-era board', () => {
    const c = fixture('y2005');
    const bytes = JSON.stringify({ c, phase: 'season', teamQuality: 86, coach: null });
    localStorage.setItem(sport.saveKey, bytes);
    let view = mount();
    let dialog = tactics(view);
    const option = within(dialog).getByRole('button', { name: /Inside routes/ });
    expect(option).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(option);
    const booked = localStorage.getItem(sport.saveKey);
    expect(booked).not.toBe(bytes);
    expect(read().programme).toMatchObject({ tactics: 'inside', sport: 'nfl', year: c.year, team: 'KC' });
    view.unmount();

    view = mount();
    dialog = tactics(view);
    expect(within(dialog).getByRole('button', { name: /Inside routes/ })).toHaveAttribute('aria-pressed', 'true');
    expect(localStorage.getItem(sport.saveKey)).toBe(booked);
    fireEvent.click(dialog.querySelector('[data-us-programme-close]')!);
    vi.spyOn(Math, 'random').mockReturnValue(0.8);
    fireEvent.click(within(view.container).getByRole('button', { name: 'Play the ' + c.year + ' season' }));
    const saved = read(), line = saved.seasons.at(-1)!;
    expect(line).toMatchObject({ year: c.year, games: 16, rec: 118, recYds: 1439, recTd: 11, poLine: '6 rec, 66 yds' });
    expect(saved.programme).toBeUndefined();
    expect(saved.programmeResults?.at(-1)?.decisions).toContainEqual({
      section: 'tactics', label: 'Inside routes', outcome: 'completed', actual: 13, unit: 'additional receptions',
    });
    const reveal = view.container.querySelector('[data-season-reveal]') as HTMLElement;
    expect(within(reveal).getByText(/Inside routes took you from 105 to 118 receptions/)).toBeInTheDocument();
    expect(sport.reviewStats(line, 'WR').regular).toMatchObject([
      { label: 'Receptions', value: '118' }, { label: 'Receiving yards', value: '1,439' }, { label: 'Receiving touchdowns', value: '11' },
    ]);
  });
});
