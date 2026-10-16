import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClubDetailScreen } from '@/components/club-manager/ClubDetailScreen';
import { careerRoundPairs, leagueRounds, loadCareer, moneyIn, oppRosterFor, SAVE_KEY, startCareer, type CareerState } from '@/lib/clubManager';

// Scores and edited memberships below are synthetic saved fixtures, not real match claims.
type FixtureRow = { round: number; home: string; away: string; homeGoals: number | null; awayGoals: number | null; status: 'recorded' | 'unrecorded' | 'upcoming' };
type FixtureList = { leagueId: string; leagueName: string; rows: FixtureRow[] } | null;
type Reader = (career: CareerState, clubName: string) => FixtureList;
const readers = import.meta.glob('/src/lib/clubDetailFixtures.ts');
function roll<T>(action: () => T): T {
  const random = vi.spyOn(Math, 'random').mockReturnValue(0.6);
  const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-16T00:00:00Z'));
  try { return action(); } finally { random.mockRestore(); clock.mockRestore(); }
}
function initial(): CareerState { return roll(() => startCareer('Brentford')); }
function played(state: CareerState, count: number): void {
  let found = 0;
  state.week = count === 0 ? 0 : state.calendar.findIndex(entry => entry.type === 'league' && ++found === count) + 1;
  expect(count === 0 || state.week > 0).toBe(true);
}
function twoClubs(): CareerState {
  const state = initial(); state.leagueClubs = ['Brentford', 'Arsenal']; played(state, 1);
  state.pairResults = { premier: { 'Brentford|Arsenal': [3, 1], 'Arsenal|Brentford': [8, 7] } };
  return state;
}
function screen(state: CareerState, club = state.clubName) {
  const onBack = vi.fn();
  return { ...render(<ClubDetailScreen clubName={club} career={state} onBack={onBack} />), onBack };
}
async function fixtures(view: ReturnType<typeof screen>): Promise<Reader> {
  const button = view.queryByRole('button', { name: 'Fixtures', exact: true });
  expect(button !== null, 'club detail must offer its saved league fixtures').toBe(true);
  fireEvent.click(button!);
  expect(view.getByRole('region', { name: 'Club league fixtures' })).toBeInTheDocument();
  const load = readers['/src/lib/clubDetailFixtures.ts']; expect(typeof load).toBe('function');
  const module = await load() as { clubLeagueFixtures: Reader };
  expect(typeof module.clubLeagueFixtures).toBe('function'); return module.clubLeagueFixtures;
}
const rows = (view: ReturnType<typeof screen>) => [...view.getByRole('region', { name: 'Club league fixtures' }).querySelectorAll('[data-club-fixture]')];
const names = (view: ReturnType<typeof screen>) => [...view.container.querySelectorAll('.bg-card')[1].querySelectorAll('div.py-1\\.5 span.text-xs')].map(node => node.textContent);
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe('Club detail saved league fixtures', () => {
  it('fixtures show the saved directed score and calendar-prefix progress', async () => {
    const state = twoClubs(), before = JSON.stringify(state), view = screen(state), random = vi.spyOn(Math, 'random');
    const read = await fixtures(view);
    expect(read(state, state.clubName)).toEqual({ leagueId: 'premier', leagueName: 'Premier League', rows: [
      { round: 0, home: 'Brentford', away: 'Arsenal', homeGoals: 3, awayGoals: 1, status: 'recorded' },
      { round: 1, home: 'Arsenal', away: 'Brentford', homeGoals: null, awayGoals: null, status: 'upcoming' },
    ] });
    expect(rows(view)).toHaveLength(2); expect(rows(view)[0]).toHaveTextContent('3 - 1');
    expect(rows(view)[1]).toHaveTextContent('Upcoming'); expect(rows(view)[1]).not.toHaveTextContent('8 - 7');
    expect(JSON.stringify(state)).toBe(before); expect(random).not.toHaveBeenCalled(); expect(view.onBack).not.toHaveBeenCalled();
  });

  it('fixtures follow saved world membership and its independent round counter', async () => {
    const state = initial(); played(state, 3);
    state.world = { laliga: { round: 1, table: ['Real Madrid', 'Barcelona'].map(club => ({ club, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 })) } };
    state.pairResults = { laliga: { 'Real Madrid|Barcelona': [2, 1], 'Barcelona|Real Madrid': [9, 9] } };
    const view = screen(state, 'Real Madrid'), read = await fixtures(view), result = read(state, 'Real Madrid');
    expect(result?.leagueId).toBe('laliga'); expect(result?.rows).toHaveLength(2);
    expect(result?.rows.map(row => row.status)).toEqual(['recorded', 'upcoming']);
    expect(result?.rows[0]).toMatchObject({ home: 'Real Madrid', away: 'Barcelona', homeGoals: 2, awayGoals: 1 });
    expect(rows(view)[0]).toHaveTextContent('2 - 1'); expect(rows(view)[1]).toHaveTextContent('Upcoming');
  });

  it('fixtures leave missing legacy scores unrecorded instead of inferring table results', async () => {
    const state = twoClubs(); delete state.pairResults; state.table = state.table.map(row => ({ ...row, w: 12, gf: 99, ga: 5, pts: 36 }));
    const view = screen(state), read = await fixtures(view);
    expect(read(state, state.clubName)?.rows[0]).toMatchObject({ status: 'unrecorded', homeGoals: null, awayGoals: null });
    expect(rows(view)[0]).toHaveTextContent('Result not recorded');
    expect(rows(view)[1]).toHaveTextContent('Upcoming');
    state.pairResults = { premier: { 'Brentford|Arsenal': [-1, 2] } };
    expect(read(state, state.clubName)?.rows[0].status).toBe('unrecorded');
  });

  it('fixtures use the founded clubs saved odd league and omit its byes', async () => {
    const state = roll(() => startCareer('Harbour Fixture Club', undefined, {
      name: 'Harbour Fixture Club', stadium: 'Harbour Park', budgetTier: 'mid', leagueId: 'premier', replacedClub: '',
      crest: { shape: 0, pattern: 0, color1: '#123456', color2: '#ffffff', initials: 'HFC' }, quality: 80,
    }));
    state.leagueClubs = ['Harbour Fixture Club', 'Fixture Rival', 'Fixture Third']; played(state, 0);
    const view = screen(state), read = await fixtures(view), result = read(state, state.clubName);
    expect(result?.rows).toHaveLength(4); expect(result?.rows.every(row => row.status === 'upcoming')).toBe(true);
    expect(new Set(result?.rows.flatMap(row => [row.home, row.away]))).toEqual(new Set(state.leagueClubs));
    expect(result?.rows.every(row => row.round >= 0 && row.round < 6)).toBe(true); expect(rows(view)).toHaveLength(4);
  });

  it('fixtures explain when the clicked club has no saved league membership', async () => {
    const state = initial(); state.world = {};
    const view = screen(state, 'Real Madrid'), read = await fixtures(view);
    expect(read(state, 'Real Madrid')).toBeNull();
    expect(view.getByRole('region', { name: 'Club league fixtures' })).toHaveTextContent('League fixtures are not available for this club in this save.');
    expect(rows(view)).toHaveLength(0);
  });

  it('fixtures retain the actual saved first-season schedule after the real save loader', async () => {
    const state = initial(); played(state, 2);
    const view = screen(state), read = await fixtures(view), result = read(state, state.clubName);
    const expected = Array.from({ length: leagueRounds(state.leagueClubs.length) }, (_, round) =>
      careerRoundPairs(state, round).filter(pair => pair.includes(state.clubName)).map(([home, away]) => ({ round, home, away }))).flat();
    expect(result?.rows.map(({ round, home, away }) => ({ round, home, away }))).toEqual(expected);
    localStorage.setItem(SAVE_KEY, JSON.stringify(state)); const loaded = roll(() => loadCareer());
    expect(loaded).not.toBeNull(); const before = JSON.stringify(loaded), random = vi.spyOn(Math, 'random');
    expect(read(loaded!, state.clubName)).toEqual(result); expect(JSON.stringify(loaded)).toBe(before); expect(random).not.toHaveBeenCalled();
  });

  it('fixtures Back returns to the same squad before the outer Back leaves the club', async () => {
    const state = twoClubs(), view = screen(state), originalNames = names(view);
    await fixtures(view); fireEvent.click(within(view.getByRole('region', { name: 'Club league fixtures' })).getByRole('button', { name: 'Back', exact: true }));
    expect(view.queryByRole('region', { name: 'Club league fixtures' })).toBeNull(); expect(names(view)).toEqual(originalNames);
    expect(view.onBack).not.toHaveBeenCalled(); fireEvent.click(view.getByRole('button', { name: 'Back', exact: true })); expect(view.onBack).toHaveBeenCalledOnce();
  });

  it('preservation keeps the initial owned squad value and best eleven', () => {
    const state = initial(), view = screen(state), text = view.container.textContent ?? '';
    expect(names(view)).toEqual(state.squad.map(player => player.name));
    expect(text).toContain(`${moneyIn(state)(Math.round(state.squad.reduce((sum, player) => sum + (player.value ?? 0), 0)))}Squad value`);
    const best = state.squad.map(player => player.rating).sort((a, b) => b - a).slice(0, 11);
    expect(text).toContain(`${Math.round(best.reduce((sum, rating) => sum + rating, 0) / best.length)}Best XI`);
  });

  it('preservation keeps the initial rival world roster', () => {
    const state = initial(), view = screen(state, 'Real Madrid');
    expect(names(view)).toEqual([...oppRosterFor(state, 'Real Madrid')].sort((a, b) => b.v - a.v).map(player => player.n));
  });

  it('preservation keeps outer navigation and does not write or draw randomness', () => {
    const state = initial(), before = JSON.stringify(state), random = vi.spyOn(Math, 'random'), write = vi.spyOn(Storage.prototype, 'setItem');
    const view = screen(state); fireEvent.click(view.getByRole('button', { name: 'Back', exact: true }));
    expect(view.onBack).toHaveBeenCalledOnce(); expect(JSON.stringify(state)).toBe(before); expect(random).not.toHaveBeenCalled(); expect(write).not.toHaveBeenCalled();
  });
});
