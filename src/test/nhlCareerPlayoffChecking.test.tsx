import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NhlMyCareerBoard from '@/components/nhl-my-career/NhlMyCareerBoard';
import { keyedRng } from '@/lib/keyedRng';
import { NHL_CAREER_SPORT as sport } from '@/lib/nhlCareerSport';
import { NHL_ARCHETYPES, simNhlSeason, startNhlCareer, type NhlCareerState } from '@/lib/nhlMyCareer';
import { prepareUsCareerProgramme, restoreUsCareerProgramme, saveUsCareerProgramme, settleUsCareerProgramme,
  usProgrammeDefaults, usProgrammeMenus, type ProgrammeCareer } from '@/lib/usCareerProgramme';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('@/lib/completions', () => ({ recordActivity: vi.fn(), recordCompletion: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));

type Career = NhlCareerState & ProgrammeCareer;
const title = 'Take a playoff checking role';
const options = { ...usProgrammeDefaults(), tactics: 'playoff-checking' as const };
function forward(): Career {
  const c = startNhlCareer('Playoff Forward', 'C', NHL_ARCHETYPES.C[0], keyedRng('checking career'), null, 'now');
  Object.assign(c, { team: 'SEA', year: 2026, age: 23, role: 'starter', ovr: 88, pot: 95, health: 95, morale: 74, contractYears: 2 });
  delete c.rival;
  return c;
}
function play(seed: string, chosen: boolean, setup: Partial<Career> = {}) {
  const before = { ...forward(), ...setup };
  const c = chosen ? saveUsCareerProgramme(before, 'nhl', options) : before;
  const prep = prepareUsCareerProgramme(c, 'nhl');
  const { line } = simNhlSeason(c, 77, keyedRng(seed), true, prep);
  restoreUsCareerProgramme(c, prep);
  const receipt = settleUsCareerProgramme(c, line, 'nhl', prep);
  return { line, receipt };
}
const open = () => render(<MemoryRouter><NhlMyCareerBoard /></MemoryRouter>);
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe('Playoff checking assignment for NHL forwards', () => {
  it('changes an actual series result on the same playoff draw', () => {
    const usual = play('checking:12', false), checking = play('checking:12', true);
    const regular = { games: 83, goals: 56, assists: 51, points: 107 };
    expect(usual.line).toMatchObject({ ...regular, teamResult: 'Lost in Round 1', poGames: 7, poGoals: 5, poAssists: 3 });
    expect(checking.line).toMatchObject({ ...regular, teamResult: 'Lost in Round 2', poGames: 11, poPoints: 12,
      poChecking: { seriesEdge: 4, pointsTraded: 3 } });
    expect(usual.line).not.toHaveProperty('poChecking');
    expect(sport.reviewStats(usual.line, 'C').postseason.some(stat => stat.label === 'Playoff role')).toBe(false);
  });

  it('charges production on the same games and credits reduced fourth-line impact on a short slate', () => {
    const normal = play('checking:1', false).line, assigned = play('checking:1', true);
    expect(normal).toMatchObject({ poGames: 9, poGoals: 7, poAssists: 7, poPoints: 14 });
    expect(assigned.line).toMatchObject({ poGames: 9, poGoals: 6, poAssists: 6, poPoints: 12 });
    expect(assigned.receipt?.decisions).toEqual([{ section: 'tactics', label: title, outcome: 'completed',
      actual: 2, unit: 'points traded for checking in this playoff run' }]);
    const short = play('checking:1', true, { role: 'backup', year: 2012, eraId: 'y2006', team: 'BOS' });
    expect(short.line).toMatchObject({ slate: 48, poChecking: { seriesEdge: 2 } });
  });

  it('skips the assignment on a missed berth and keeps it off other positions and sports', () => {
    expect(play('checking:0', true).line).toEqual(play('checking:0', false).line);
    expect(play('checking:0', true).receipt?.decisions).toEqual([{ section: 'tactics', label: title, outcome: 'unused' }]);
    const c = forward();
    for (const pos of ['C', 'LW', 'RW', 'D', 'G']) {
      const menu = usProgrammeMenus({ ...c, pos }, 'nhl').find(m => m.id === 'tactics');
      expect(menu?.options.some(o => o.id === 'playoff-checking')).toBe(['C', 'LW', 'RW'].includes(pos));
    }
    expect(usProgrammeMenus(c, 'nba').find(m => m.id === 'tactics')?.options.some(o => o.id === 'playoff-checking')).toBe(false);
    const selected = saveUsCareerProgramme(c, 'nhl', options);
    expect(prepareUsCareerProgramme({ ...selected, team: 'BOS' }, 'nhl')).toBeNull();
    expect(saveUsCareerProgramme(selected, 'nhl', null)).toEqual(c);
  });

  it('plays the signed-out choice and reviews the frozen postseason after reloading', async () => {
    localStorage.setItem(sport.saveKey, JSON.stringify({ c: forward(), phase: 'season', teamQuality: 77, coach: null }));
    const initial = open();
    fireEvent.click(screen.getByRole('button', { name: 'Plan your season' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue to programme' }));
    fireEvent.click(screen.getByRole('button', { name: /Tactical approach/ }));
    fireEvent.click(screen.getByRole('button', { name: /Take a playoff checking role/ }));
    expect(JSON.parse(localStorage.getItem(sport.saveKey)!).c.programme.tactics).toBe('playoff-checking');
    initial.unmount();
    const season = open(), rng = keyedRng('checking:12');
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.8).mockImplementation(rng);
    fireEvent.click(season.getByRole('button', { name: 'Play the 2026 season' }));
    const stored = localStorage.getItem(sport.saveKey)!;
    const career = JSON.parse(stored).c as Career;
    expect(career.programme).toBeUndefined();
    expect(career.seasons.at(-1)).toMatchObject({ teamResult: 'Lost in Round 2', poGoals: 6, poAssists: 6,
      poChecking: { seriesEdge: 4, pointsTraded: 3 } });
    expect(career.programmeResults?.at(-1)?.decisions[0]).toMatchObject({ label: title, actual: 3 });
    season.unmount();
    const reload = open();
    fireEvent.click(await reload.findByRole('button', { name: /Career Log/ }));
    fireEvent.click(await reload.findByRole('button', { name: 'Review 2026 season' }));
    fireEvent.click(reload.getByRole('button', { name: 'Postseason' }));
    const value = (label: string) => reload.container.querySelector(`[data-season-stat="${label}"] dd`)?.textContent;
    expect(value('Playoff role')).toBe('Checking line');
    expect(value('Series win chance added (percentage points)')).toBe('4');
    expect(value('Points traded in this run')).toBe('3');
    expect(value('Points')).toBe('12');
    expect(localStorage.getItem(sport.saveKey)).toBe(stored);
  }, 15000);
});
