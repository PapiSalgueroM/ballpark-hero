import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NhlMyCareerBoard from '@/components/nhl-my-career/NhlMyCareerBoard';
import { keyedRng } from '@/lib/keyedRng';
import { NHL_ARCHETYPES, nhlCampBattle, simNhlSeason, startNhlCareer } from '@/lib/nhlMyCareer';
import { NHL_CAREER_SPORT as sport } from '@/lib/nhlCareerSport';
import { prepareUsCareerProgramme, saveUsCareerProgramme, usProgrammeDefaults, usProgrammeMenus, type ProgrammeCareer } from '@/lib/usCareerProgramme';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));

function center() {
  const c = startNhlCareer('Draw Test', 'C', NHL_ARCHETYPES.C.find(a => a.id === 'faceoff')!, keyedRng('zone draw fixture'), null, 'now');
  Object.assign(c, { team: 'SEA', year: 2026, age: 24, ovr: 82, pot: 90, role: 'backup', health: 95, morale: 78, contractYears: 3 });
  delete c.rival;
  return c;
}
const choices = { ...usProgrammeDefaults(), tactics: 'zone-draws' as const };
const open = () => render(<MemoryRouter><NhlMyCareerBoard /></MemoryRouter>);
const read = (): ReturnType<typeof center> & ProgrammeCareer => JSON.parse(localStorage.getItem(sport.saveKey)!).c;
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe('Defensive-zone faceoffs', () => {
  it('trades scoring opportunities for measured draws and rewards the assignment only at the next same-team camp', () => {
    const base = center();
    const assigned = saveUsCareerProgramme(structuredClone(base), 'nhl', choices);
    const normal = simNhlSeason(structuredClone(base), 74, keyedRng('faceoff season')).line;
    const result = simNhlSeason(assigned, 74, keyedRng('faceoff season'), false, prepareUsCareerProgramme(assigned, 'nhl')).line;
    expect(normal.defensiveDraws).toBeUndefined();
    expect(result.defensiveDraws).toBeDefined();
    const { taken, won } = result.defensiveDraws!;
    expect(taken).toBe(2 * result.games);
    expect(won).toBeGreaterThan(taken / 2);
    expect(won).toBeLessThan(taken);
    expect(result.points).toBeLessThan(normal.points!);
    expect(result.games).toBe(normal.games);
    const next = { ...assigned, year: 2027, ovr: 75, role: 'backup' as const };
    const camp = (c: typeof next) => { const player = structuredClone(c); nhlCampBattle(player, 77, () => 0.999); return player.role; };
    expect(camp(next)).toBe('starter');
    expect(camp({ ...next, seasons: [normal] })).toBe('backup');
    expect(camp({ ...next, team: 'BOS' })).toBe('backup');
    expect(camp({ ...next, year: 2028 })).toBe('backup');
    expect(camp({ ...next, seasons: [{ ...result, defensiveDraws: { taken: 29, won: 29 } }] })).toBe('backup');
    expect(camp({ ...next, seasons: [{ ...result, defensiveDraws: { taken: 100, won: 50 } }] })).toBe('backup');
  });

  it('offers the assignment only to an eligible center and scales its opportunities to short seasons', () => {
    const c = center();
    const available = (career: ProgrammeCareer) => usProgrammeMenus(career, 'nhl').find(menu => menu.id === 'tactics')!.options.some(option => option.id === 'zone-draws');
    expect(available(c)).toBe(true);
    for (const pos of ['LW', 'RW', 'D', 'G']) expect(available({ ...c, pos })).toBe(false);
    expect(available({ ...c, suspendedSeasons: 1 })).toBe(false);
    expect(available({ ...c, contractYears: 0 })).toBe(false);
    const short = saveUsCareerProgramme({ ...c, eraId: 'y2006' as const, year: 2012, team: 'BOS', role: 'starter' as const }, 'nhl', choices);
    const line = simNhlSeason(short, 75, keyedRng('short faceoffs'), false, prepareUsCareerProgramme(short, 'nhl')).line;
    expect(line.slate).toBe(48);
    expect(line.defensiveDraws?.taken).toBe(4 * line.games);
  });

  it('remembers the choice, settles it once, and shows the actual won and lost draws after reload', async () => {
    const c = center();
    localStorage.setItem(sport.saveKey, JSON.stringify({ c, phase: 'season', teamQuality: 77, coach: null }));
    const session = open();
    fireEvent.click(screen.getByRole('button', { name: 'Plan your season' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue to programme' }));
    fireEvent.click(screen.getByRole('button', { name: /Tactical approach/ }));
    fireEvent.click(screen.getByRole('button', { name: /Take defensive-zone faceoffs/ }));
    expect(read().programme?.tactics).toBe('zone-draws');
    session.unmount();
    const next = open();
    vi.spyOn(Math, 'random').mockImplementation(keyedRng('faceoff UI'));
    fireEvent.click(screen.getByRole('button', { name: 'Play the 2026 season' }));
    const done = read();
    const draws = done.seasons.at(-1)?.defensiveDraws;
    expect(draws).toBeDefined();
    expect(done.programme).toBeUndefined();
    expect(done.programmeResults?.at(-1)?.decisions[0]).toMatchObject({ label: 'Take defensive-zone faceoffs', actual: draws!.won });
    next.unmount();
    const stored = localStorage.getItem(sport.saveKey), review = open();
    fireEvent.click(await screen.findByRole('button', { name: /Career Log/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Review 2026 season' }));
    fireEvent.click(screen.getByRole('button', { name: 'Regular season' }));
    const value = (label: string) => review.container.querySelector(`[data-season-stat="${label}"] dd`)?.textContent;
    expect(value('Defensive draws won')).toBe(String(draws!.won));
    expect(value('Defensive draws lost')).toBe(String(draws!.taken - draws!.won));
    expect(localStorage.getItem(sport.saveKey)).toBe(stored);
  }, 15000);
});
