import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NbaMyCareerBoard from '@/components/nba-my-career/NbaMyCareerBoard';
import { keyedRng } from '@/lib/keyedRng';
import { NBA_CAREER_SPORT as sport } from '@/lib/nbaCareerSport';
import { setNbaRestPlan, type NbaCareerState } from '@/lib/nbaMyCareer';
import { prepareUsCareerProgramme, restoreUsCareerProgramme, saveUsCareerProgramme, settleUsCareerProgramme, usProgrammeDefaults, type ProgrammeCareer } from '@/lib/usCareerProgramme';
import { nbaSeasonReview } from '@/lib/usCareerSeasonReview';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));

type Career = NbaCareerState & ProgrammeCareer;
const label = 'Lead the second unit';
const choice = { ...usProgrammeDefaults(), tactics: 'second-unit' as const };
const book = (c: Career) => saveUsCareerProgramme(c, 'nba', choice);
const read = (): Career => JSON.parse(localStorage.getItem(sport.saveKey)!).c;

function veteran(): Career {
  const career = sport.startCareer('Fixture Guard', 'SG', sport.create.archetypes.SG[0], keyedRng('nba-second-unit'), null, 'now');
  const { line } = sport.simSeason(career, 78, () => 0.99);
  sport.progress(career, () => 0.99, line.seasonRating);
  delete career.pendingRivalryEvent;
  delete career.pendingRivalryChoice;
  return { ...career, role: 'starter', age: 28, ovr: 95, pot: 97, morale: 84, health: 98, contractYears: 3 };
}

function play(c: Career, seed = 'nba-second-unit:award') {
  const stream = keyedRng(seed);
  let draws = 0;
  const rng = () => { draws++; return stream(); };
  const prep = prepareUsCareerProgramme(c, 'nba');
  const { line, notes } = sport.simSeason(c, 85, rng, true, prep);
  restoreUsCareerProgramme(c, prep);
  sport.progress(c, rng, line.seasonRating);
  const receipt = settleUsCareerProgramme(c, line, 'nba', prep);
  return { c, line, notes, receipt, prep, draws, nextDraw: stream() };
}

function openTactics() {
  fireEvent.click(screen.getByRole('button', { name: 'Plan your season' }));
  const dialog = within(screen.getByRole('dialog', { name: 'NBA season programme' }));
  fireEvent.click(dialog.getByRole('button', { name: 'Continue to programme' }));
  fireEvent.click(dialog.getByRole('button', { name: /Tactical approach/ }));
  return dialog;
}

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe('NBA career lead the second unit', () => {
  it('trades starter production for Sixth Man consideration without consuming a different random tape', () => {
    const first = veteran();
    const usual = play(structuredClone(first));
    const bench = play(book(structuredClone(first)));

    expect(bench.line.benchAppearances).toBe(bench.line.games);
    expect(bench.line.games).toBe(usual.line.games);
    expect(bench.line.mpg).toBeLessThan(usual.line.mpg!);
    expect(bench.line.ppg).toBeLessThan(usual.line.ppg);
    expect(usual.line.awards).not.toContain('Sixth Man of the Year');
    expect(bench.line.awards).toContain('Sixth Man of the Year');
    expect([bench.line.teamResult, bench.line.poPpg, bench.line.poRpg, bench.line.poApg]).toEqual(
      [usual.line.teamResult, usual.line.poPpg, usual.line.poRpg, usual.line.poApg],
    );
    expect([bench.draws, bench.nextDraw]).toEqual([usual.draws, usual.nextDraw]);
    expect(bench.c.role).toBe('starter');
    expect(bench.c.earnings).toBe(usual.c.earnings);
    expect(bench.receipt?.decisions).toEqual([{ section: 'tactics', label, outcome: 'completed', actual: bench.line.games, unit: 'bench appearances' }]);
    expect(nbaSeasonReview(bench.line).regular).toContainEqual(expect.objectContaining({ label: 'Bench appearances', numeric: { raw: bench.line.games, digits: 0 } }));
    expect(nbaSeasonReview(usual.line).regular.some(stat => stat.label === 'Bench appearances')).toBe(false);
    const saved = JSON.stringify(bench.c);
    expect(settleUsCareerProgramme(bench.c, bench.line, 'nba', bench.prep)).toBeNull();
    expect(JSON.stringify(bench.c)).toBe(saved);
  });

  it('uses the camp role in the playoffs after a regular season off the bench', () => {
    const first = veteran();
    const usual = play(structuredClone(first), 'nba-second-unit:playoffs');
    const bench = play(book(structuredClone(first)), 'nba-second-unit:playoffs');
    expect(usual.line.poGames).toBeGreaterThan(0);
    expect(bench.line.benchAppearances).toBeGreaterThan(0);
    expect([bench.line.poGames, bench.line.poPpg, bench.line.poRpg, bench.line.poApg]).toEqual(
      [usual.line.poGames, usual.line.poPpg, usual.line.poRpg, usual.line.poApg],
    );
  });

  it('leaves an existing backup season alone and records that the request went unused', () => {
    const first = veteran();
    first.role = 'backup';
    const usual = play(structuredClone(first));
    const planned = play(book(structuredClone(first)));
    expect(planned.line).toEqual(usual.line);
    expect(planned.draws).toBe(usual.draws);
    expect(planned.receipt?.decisions).toEqual([{ section: 'tactics', label, outcome: 'unused' }]);
  });

  it('settles in a contract year and releases the booked starter rest games when the role changes', () => {
    const first = veteran();
    first.contractYears = 1;
    const usual = play(setNbaRestPlan(structuredClone(first), true));
    const bench = play(book(setNbaRestPlan(structuredClone(first), true)));
    expect(usual.line.restGames).toBe(8);
    expect(bench.line.restGames).toBeUndefined();
    expect(bench.c.restPlan).toBeUndefined();
    expect(bench.notes).toContain('The second-unit assignment replaced your scheduled rest games.');
    expect(bench.c.contractYears).toBe(0);
    expect(bench.line.salary).toBe(first.salary);
    expect(bench.receipt?.decisions[0]).toMatchObject({ label, outcome: 'completed', actual: bench.line.games });
  });

  it('counts appearances from a shortened season and ignores a plan from another club', () => {
    const first = { ...veteran(), eraId: 'y2004' as const, team: 'CHI', year: 2011 };
    const usual = play(structuredClone(first));
    const bench = play(book(structuredClone(first)));
    const stale = book(structuredClone(first));
    stale.team = 'BOS';
    const restored = play(stale);
    const unplanned = play({ ...first, team: 'BOS' });
    expect(bench.line.games).toBeLessThanOrEqual(66);
    expect(bench.line.games).toBe(usual.line.games);
    expect(bench.line.benchAppearances).toBe(bench.line.games);
    expect(restored.line).toEqual(unplanned.line);
    expect(restored.receipt).toBeNull();
  });

  it('offers rotation choice only for active NBA players under contract with played games', () => {
    const first = veteran();
    expect(book(first).programme?.tactics).toBe('second-unit');
    for (const excluded of [
      { ...first, contractYears: 0 }, { ...first, seasons: [] },
      { ...first, suspendedSeasons: 1 }, { ...first, retired: true },
    ]) expect(book(excluded)).toBe(excluded);
    for (const other of ['nfl', 'mlb', 'nhl'] as const) expect(saveUsCareerProgramme(first, other, choice)).toBe(first);
  });

  it('keeps the choice on reload and settles one real season from the normal NBA board', () => {
    const first = veteran();
    const bytes = JSON.stringify({ c: first, phase: 'season', teamQuality: 85, coach: null });
    localStorage.setItem(sport.saveKey, bytes);
    const mount = () => render(<MemoryRouter><NbaMyCareerBoard /></MemoryRouter>);
    const initial = mount();
    const option = openTactics().getByRole('button', { name: new RegExp(label) });
    expect(option).toHaveTextContent(/fewer minutes.*Sixth Man/i);
    expect(localStorage.getItem(sport.saveKey)).toBe(bytes);
    fireEvent.click(option);
    expect(read().programme).toMatchObject({ team: first.team, year: first.year, tactics: 'second-unit' });
    const planned = localStorage.getItem(sport.saveKey);
    initial.unmount();

    const reopened = mount();
    expect(openTactics().getByRole('button', { name: new RegExp(label) })).toHaveAttribute('aria-pressed', 'true');
    expect(localStorage.getItem(sport.saveKey)).toBe(planned);
    fireEvent.click(document.querySelector('[data-us-programme-close]')!);
    vi.spyOn(Math, 'random').mockImplementation(keyedRng('nba-second-unit:board'));
    fireEvent.click(screen.getByRole('button', { name: 'Play the ' + first.year + ' season' }));
    const settled = read();
    expect(settled.seasons).toHaveLength(first.seasons.length + 1);
    expect(settled.seasons.at(-1)).toMatchObject({ year: first.year, benchAppearances: expect.any(Number) });
    expect(settled.programme).toBeUndefined();
    expect(settled.programmeResults?.[0].decisions[0]).toMatchObject({ label, outcome: 'completed' });
    expect(within(reopened.container.querySelector('[data-season-reveal]')!).getByText(/Lead the second unit.*bench appearances/i)).toBeInTheDocument();
    const played = localStorage.getItem(sport.saveKey);
    reopened.unmount();

    mount().unmount();
    expect(localStorage.getItem(sport.saveKey)).toBe(played);
  });
});
