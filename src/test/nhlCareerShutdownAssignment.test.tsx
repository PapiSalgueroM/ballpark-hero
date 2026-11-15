import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NhlMyCareerBoard from '@/components/nhl-my-career/NhlMyCareerBoard';
import { keyedRng } from '@/lib/keyedRng';
import { NHL_CAREER_SPORT as sport } from '@/lib/nhlCareerSport';
import { NHL_ARCHETYPES, simNhlSeason, startNhlCareer, type NhlCareerState } from '@/lib/nhlMyCareer';
import {
  prepareUsCareerProgramme, restoreUsCareerProgramme, saveUsCareerProgramme, settleUsCareerProgramme,
  usProgrammeDefaults, usProgrammeMenus, type ProgrammeCareer,
} from '@/lib/usCareerProgramme';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));

type Career = NhlCareerState & ProgrammeCareer;
const title = 'Shutdown assignment';
const savedDecision = { section: 'tactics', label: title, outcome: 'completed', actual: 5.9, unit: 'percentage points of playoff qualification' };
const plan = (c: Career): Career => saveUsCareerProgramme(c, 'nhl', { ...usProgrammeDefaults(), tactics: 'defend' });
const open = () => render(<MemoryRouter><NhlMyCareerBoard /></MemoryRouter>);
const read = (): Career => JSON.parse(localStorage.getItem(sport.saveKey)!).c;

function career(): Career {
  const c = startNhlCareer('Fixture Defenseman', 'D', NHL_ARCHETYPES.D[0], keyedRng('shutdown career'), null, 'now');
  Object.assign(c, { team: 'SEA', year: 2026, age: 23, role: 'starter', ovr: 88, pot: 95, health: 95, morale: 74, contractYears: 3 });
  delete c.rival;
  simNhlSeason(c, 73, () => 0.83, true);
  return { ...c, year: 2027, age: 24, health: 95 };
}

function play(c: Career, seed: string | (() => number), teamQuality = 73) {
  const rng = typeof seed === 'function' ? seed : keyedRng(seed);
  let draws = 0;
  const prep = prepareUsCareerProgramme(c, 'nhl');
  const { line, notes } = simNhlSeason(c, teamQuality, () => { draws++; return rng(); }, true, prep);
  restoreUsCareerProgramme(c, prep);
  const receipt = settleUsCareerProgramme(c, line, 'nhl', prep);
  return { line, notes, draws, receipt };
}

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe('NHL shutdown assignment', () => {
  it('trades personal regular-season scoring for a real Seattle playoff berth on the same qualifying draw', () => {
    const c = career();
    const usual = play(structuredClone(c), 'shutdown:2');
    const assigned = play(plan(structuredClone(c)), 'shutdown:2');
    expect(usual.line).toMatchObject({ year: 2027, team: 'SEA', slate: 84, games: 83, goals: 19, assists: 55, points: 74, teamResult: 'Missed the playoffs' });
    expect(usual.draws).toBe(11);
    expect(assigned.line.teamResult).toBe('Lost in Round 1');
    expect(assigned.line.games).toBe(usual.line.games);
    expect(assigned.line.seasonRating).toEqual(usual.line.seasonRating);
    expect(assigned.line.goals).toBeLessThan(usual.line.goals!);
    expect(assigned.line.assists).toBeLessThan(usual.line.assists!);
    expect(assigned.line.points).toBe(assigned.line.goals! + assigned.line.assists!);
    expect(assigned.notes).toContainEqual(expect.stringContaining('added 5.9 percentage points'));
    expect(assigned.receipt?.decisions).toEqual([savedDecision]);
  });

  it('preserves the postseason line and draw count when both assignments qualify', () => {
    const c = career();
    const usual = play(structuredClone(c), 'shutdown:3');
    const assigned = play(plan(structuredClone(c)), 'shutdown:3');
    expect(assigned.line).toMatchObject({ teamResult: 'Lost in Round 1', poGames: 5, poGoals: 3, poAssists: 5, poPoints: 8 });
    expect(assigned.line.points).toBeLessThan(usual.line.points!);
    expect(assigned.draws).toBe(usual.draws);
    expect(play(plan(structuredClone(c)), 'shutdown:0').line.teamResult).toBe('Missed the playoffs');
  });

  it('costs no scoring at the qualification cap and restores the baseline when cleared', () => {
    const c = career();
    const capped = play(plan(structuredClone(c)), 'shutdown:2', 100);
    const usual = play(structuredClone(c), 'shutdown:2', 100);
    expect(capped.line).toEqual(usual.line);
    expect(capped.draws).toBe(usual.draws);
    expect(capped.receipt?.decisions).toEqual([{ section: 'tactics', label: title, outcome: 'unused' }]);
    const cleared = saveUsCareerProgramme(plan(structuredClone(c)), 'nhl', null);
    expect(cleared.programme).toBeUndefined();
    expect(play(cleared, 'shutdown:2')).toEqual(play(c, 'shutdown:2'));
    const selected = plan(c);
    expect(prepareUsCareerProgramme({ ...selected, team: 'BOS' }, 'nhl')).toBeNull();
    expect(prepareUsCareerProgramme({ ...selected, year: c.year + 1 }, 'nhl')).toBeNull();
    expect(prepareUsCareerProgramme({ ...selected, suspendedSeasons: 1 }, 'nhl')).toBeNull();
  });

  it('scales the berth edge down for a short season with an injured depth defenseman', () => {
    const c: Career = { ...career(), year: 2012, team: 'BOS', eraId: 'y2006', age: 24, role: 'backup', health: 10 };
    const assignment = play(plan(c), () => 0.2);
    expect(assignment.line.slate).toBe(48);
    expect(assignment.line.games).toBeLessThan(32);
    expect(assignment.notes).toContainEqual(expect.stringMatching(/Shutdown assignment added 1\.[5-9] percentage points/));
  });

  it('supports preview, apply, reload, and undo in the real season programme', () => {
    const c = career();
    const bytes = JSON.stringify({ c, phase: 'season', teamQuality: 73, coach: null });
    localStorage.setItem(sport.saveKey, bytes);
    const first = open();
    const tactics = () => {
      fireEvent.click(screen.getByRole('button', { name: 'Plan your season' }));
      fireEvent.click(screen.getByRole('button', { name: 'Continue to programme' }));
    };
    const openTactics = () => fireEvent.click(screen.getByRole('button', { name: /Tactical approach/ }));
    tactics();
    fireEvent.click(screen.getByRole('button', { name: 'Try a plan' }));
    openTactics();
    const choice = () => screen.getByRole('button', { name: /Shutdown assignment/ });
    fireEvent.click(choice());
    expect(localStorage.getItem(sport.saveKey)).toBe(bytes);
    fireEvent.click(screen.getByRole('button', { name: 'Apply plan' }));
    expect(read().programme).toMatchObject({ tactics: 'defend', sport: 'nhl', year: 2027, team: 'SEA' });
    first.unmount();

    const afterReload = open();
    tactics();
    openTactics();
    expect(choice()).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: /Your usual approach/ }));
    expect(read().programme).toBeUndefined();
    fireEvent.click(choice());
    fireEvent.click(screen.getByRole('dialog', { name: 'NHL season programme' }).querySelector('[data-us-programme-close]')!);
    const rng = keyedRng('shutdown:2');
    let firstDraw = true;
    vi.spyOn(Math, 'random').mockImplementation(() => {
      if (!firstDraw) return rng();
      firstDraw = false;
      return 0.8; // Opening camp, before the same season draws used above.
    });
    fireEvent.click(afterReload.getByRole('button', { name: 'Play the 2027 season' }));
    expect(read().seasons.at(-1)?.teamResult).toBe('Lost in Round 1');
    expect(read().programme).toBeUndefined();
    expect(read().programmeResults?.at(-1)?.decisions).toContainEqual(savedDecision);
    const reveal = afterReload.container.querySelector<HTMLElement>('[data-season-reveal]')!;
    expect(within(reveal).getByText(/Shutdown assignment added 5\.9 percentage points/)).toBeInTheDocument();
    for (const pos of ['C', 'LW', 'RW', 'G']) {
      expect(usProgrammeMenus({ ...c, pos }, 'nhl').find(menu => menu.id === 'tactics')?.options.some(option => option.id === 'defend')).toBe(false);
    }
  });
});
