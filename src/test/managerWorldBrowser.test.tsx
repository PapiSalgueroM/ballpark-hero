import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { WorldTablesCard } from '@/components/club-manager/WorldTablesCard';
import { LeagueTableCard } from '@/components/club-manager/LeagueTableCard';
import {
  REAL_LEAGUES, startCareer, ensureEraRosters, registerLeagueOverrides,
  worldLeagueDefs, careerLeagueOf, sortedWorldTable, leagueRounds,
  leagueTiebreak, tiebreakFootnote, playNextEntry,
  type CareerState,
} from '@/lib/clubManager';
import { swapClubs } from '@/lib/clubManagerWorldEdit';

const ERAS = ['era2020', 'era2015', 'era2010', 'era2005'];
beforeAll(async () => { for (const id of ERAS) await ensureEraRosters(id); }, 60000);
afterEach(() => { cleanup(); registerLeagueOverrides(null); vi.restoreAllMocks(); });
const ownRows = (career: CareerState) => sortedWorldTable(career, careerLeagueOf(career).id, career.table);
const mount = (career = startCareer('Arsenal')) => render(<WorldTablesCard career={career} myRows={ownRows(career)} />);
const browse = (view: ReturnType<typeof render>) => {
  fireEvent.click(view.getByRole('button', { name: 'Browse leagues' }));
  return view.getByRole('searchbox', { name: 'Find a league or club' });
};
const ids = (view: ReturnType<typeof render>) => [...view.container.querySelectorAll('[data-world-league]')].map(node => node.getAttribute('data-world-league'));
const choose = (view: ReturnType<typeof render>, id: string) => {
  const node = view.container.querySelector(`[data-world-league="${id}"]`);
  expect(node).not.toBeNull(); fireEvent.click(node!);
};
const playedCareer = () => {
  let career = startCareer('Arsenal');
  for (let i = 0; i < 12 && (career.world?.laliga?.round ?? 0) < 3; i++) career = playNextEntry(career, { skipHalftime: true }).state;
  expect(career.world?.laliga?.round).toBeGreaterThanOrEqual(3);
  return JSON.parse(JSON.stringify(career)) as CareerState;
};

describe('Club Manager world browser', () => {
  it('offers every current league once with its actual club count', () => {
    const career = startCareer('Arsenal'), view = mount(career);
    browse(view);
    const world = worldLeagueDefs(career);
    expect(ids(view).sort()).toEqual(world.map(league => league.id).sort());
    expect(new Set(ids(view)).size).toBe(world.length);
    expect(view.getByRole('status')).toHaveTextContent(`${world.length} leagues found`);
    expect(view.getByText(`${world.length} leagues in this save`)).toBeVisible();
    for (const league of world) {
      const node = view.container.querySelector(`[data-world-league="${league.id}"]`)!;
      expect(node).toHaveTextContent(league.name);
      expect(node).toHaveTextContent(`${league.clubs.length} clubs`);
    }
  });

  it('finds countries clubs accents and every term without inventing results', () => {
    const career = startCareer('Arsenal'), view = mount(career), search = browse(view);
    for (const [query, expected] of [
      ['England', ['premier', 'championship', 'mlsEast']], ['New England Revolution', ['mlsEast']], ['AUSTRALIA', ['aleague']],
      ['Süper Lig', ['denmark', 'superlig']], ['super lig', ['denmark', 'superlig']],
      ['Atletico Madrid', ['laliga']], ['australia sydney', ['aleague']],
      ['England Arsenal', ['premier']], ['Arsenal Australia', []], ['not-a-real-league', []],
    ] as Array<[string, string[]]>) {
      fireEvent.change(search, { target: { value: query } }); expect(ids(view).sort()).toEqual(expected.sort());
    }
    expect(view.getByText('No leagues match that search in this save.')).toBeVisible();
    fireEvent.click(view.getByRole('button', { name: 'Clear search' }));
    expect(ids(view)).toHaveLength(worldLeagueDefs(career).length); expect(search).toHaveFocus();
    const localeLowerCase = String.prototype.toLocaleLowerCase;
    const turkishDefault = vi.spyOn(String.prototype, 'toLocaleLowerCase').mockImplementation(function (this: string) {
      return localeLowerCase.call(this, 'tr');
    });
    try {
      expect('Italy'.toLocaleLowerCase()).toBe('ıtaly');
      for (const query of ['italy inter milan', 'inter milan']) {
        fireEvent.change(search, { target: { value: query } }); expect(ids(view)).toEqual(['seriea']);
      }
    } finally { turkishDefault.mockRestore(); }
  });

  it('keeps selection through empty searches Back and Escape and returns to My league', () => {
    const view = mount(); let search = browse(view);
    expect(search).toHaveFocus(); choose(view, 'aleague');
    expect(view.queryByRole('heading', { name: 'A-League Men' })).toBeVisible();
    expect(view.getByRole('button', { name: 'Browse leagues' })).toHaveFocus();
    search = browse(view); expect(search).toHaveValue('');
    expect(view.container.querySelector('[data-world-league="aleague"]')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.change(search, { target: { value: 'nothing matches' } });
    fireEvent.click(view.getByRole('button', { name: 'Back' }));
    expect(view.getByRole('heading', { name: 'A-League Men' })).toBeVisible();
    search = browse(view); fireEvent.change(search, { target: { value: 'Spain' } });
    fireEvent.keyDown(search, { key: 'Escape' });
    expect(view.queryByRole('region', { name: 'League browser' })).toBeNull();
    expect(view.getByRole('heading', { name: 'A-League Men' })).toBeVisible();
    expect(view.getByRole('button', { name: 'Browse leagues' })).toHaveFocus();
    const myLeague = view.getByRole('button', { name: 'My league' }); myLeague.focus(); fireEvent.click(myLeague);
    expect(view.getByRole('heading', { name: 'Premier League' })).toBeVisible();
    expect(view.getByRole('button', { name: 'Browse leagues' })).toHaveFocus();
  });

  it.each(ERAS)('restricts %s to its actual five historical leagues', id => {
    const career = startCareer('Barcelona', id), view = mount(career), search = browse(view);
    const world = worldLeagueDefs(career);
    expect(world).toHaveLength(5); expect(world.reduce((sum, league) => sum + league.clubs.length, 0)).toBe(98);
    expect(ids(view).sort()).toEqual(world.map(league => league.id).sort());
    fireEvent.change(search, { target: { value: 'Australia' } }); expect(ids(view)).toEqual([]);
    fireEvent.change(search, { target: { value: 'Barcelona' } });
    expect(ids(view)).toEqual([careerLeagueOf(career).id]);
  });

  it('finds swapped clubs in the actual edited memberships and keeps the save unchanged', () => {
    const edit = swapClubs(null, 'Celtic', 'Brentford');
    const career = startCareer('Celtic', undefined, undefined, undefined, undefined, edit);
    registerLeagueOverrides(career.leagueOverrides ?? null);
    const before = JSON.stringify(career), view = mount(career), search = browse(view);
    expect(careerLeagueOf(career).id).toBe('premier');
    fireEvent.change(search, { target: { value: 'Celtic England' } }); expect(ids(view)).toEqual(['premier']);
    fireEvent.change(search, { target: { value: 'Brentford Scotland' } }); expect(ids(view)).toEqual(['scottish']);
    choose(view, 'scottish'); expect(view.getByText('Brentford', { exact: true })).toBeVisible();
    expect(view.queryByText('Celtic', { exact: true })).toBeNull();
    expect(JSON.stringify(career)).toBe(before);
  });

  it('preserves exact saved standings rounds tiebreaks and scout callbacks', () => {
    const career = playedCareer(), scout = vi.fn(), before = JSON.stringify(career);
    const league = worldLeagueDefs(career).find(row => row.id === 'laliga')!;
    const world = career.world!.laliga, rows = sortedWorldTable(career, league.id, world.table);
    const title = `${league.name} · round ${Math.min(world.round, leagueRounds(league.clubs.length))} of ${leagueRounds(league.clubs.length)}`;
    const footnote = tiebreakFootnote(leagueTiebreak(league.id), rows, career.pairResults?.[league.id]);
    const baseline = render(<LeagueTableCard rows={rows} myClub={career.clubName} title={title} onClubClick={scout} footnote={footnote} />);
    const expected = baseline.container.firstElementChild!.outerHTML; baseline.unmount();
    const view = render(<WorldTablesCard career={career} myRows={ownRows(career)} onClubClick={scout} />);
    browse(view); choose(view, league.id);
    const actual = view.queryByText(title, { exact: true }); expect(actual).not.toBeNull();
    expect(actual!.parentElement!.outerHTML).toBe(expected);
    fireEvent.click(view.getByText(rows[0].club, { exact: true })); expect(scout).toHaveBeenCalledExactlyOnceWith(rows[0].club);
    expect(JSON.stringify(career)).toBe(before);
  });

  it('finds the actual custom club and excludes its displaced club', () => {
    const career = startCareer('Harbour Test Club', undefined, {
      name: 'Harbour Test Club', stadium: 'Harbour Park', budgetTier: 'mid', leagueId: 'premier', replacedClub: '',
      crest: { shape: 0, pattern: 0, color1: '#123456', color2: '#ffffff', initials: 'HTC' },
    });
    const displaced = career.customClub!.replacedClub, before = JSON.stringify(career);
    expect(career.leagueClubs).toContain(career.clubName); expect(career.leagueClubs).not.toContain(displaced);
    const view = mount(career), search = browse(view);
    fireEvent.change(search, { target: { value: 'Harbour Test England' } }); expect(ids(view)).toEqual(['premier']);
    fireEvent.change(search, { target: { value: `${displaced} England` } }); expect(ids(view)).toEqual([]);
    fireEvent.change(search, { target: { value: 'Harbour Test' } }); choose(view, 'premier');
    expect(view.queryByText(career.clubName, { exact: true })).toBeVisible();
    expect(view.queryByText(displaced, { exact: true })).toBeNull(); expect(JSON.stringify(career)).toBe(before);
  });

  it('searches saved world membership after a club changes leagues', () => {
    const career = playedCareer(), first = career.world!.laliga.table[0], second = career.world!.seriea.table[0];
    const spanishClub = first.club, italianClub = second.club;
    // A saved world's table is authoritative after promotion or a membership edit.
    first.club = italianClub; second.club = spanishClub;
    const restored = JSON.parse(JSON.stringify(career)) as CareerState, before = JSON.stringify(restored);
    const view = mount(restored), search = browse(view);
    fireEvent.change(search, { target: { value: `${italianClub} Spain` } }); expect(ids(view)).toEqual(['laliga']);
    fireEvent.change(search, { target: { value: `${spanishClub} Spain` } }); expect(ids(view)).toEqual([]);
    fireEvent.change(search, { target: { value: `${spanishClub} Italy` } }); expect(ids(view)).toEqual(['seriea']);
    choose(view, 'seriea'); expect(view.queryByText(spanishClub, { exact: true })).toBeVisible();
    expect(view.queryByText(italianClub, { exact: true })).toBeNull(); expect(JSON.stringify(restored)).toBe(before);
  });

  it('falls back to the current career league when a different era replaces the save', () => {
    const now = startCareer('Arsenal'), view = mount(now);
    browse(view); choose(view, 'aleague');
    const historic = startCareer('Barcelona', 'era2005');
    view.rerender(<WorldTablesCard career={historic} myRows={ownRows(historic)} />);
    expect(view.queryByRole('heading', { name: careerLeagueOf(historic).name })).toBeVisible();
    browse(view); expect(ids(view)).toHaveLength(5);
    expect(view.container.querySelector(`[data-world-league="${careerLeagueOf(historic).id}"]`)).toHaveAttribute('aria-pressed', 'true');
  });

  it('retains the independent actual engine and unchanged table baseline', () => {
    const career = playedCareer(), world = worldLeagueDefs(career);
    expect(world.map(league => league.id)).toEqual(REAL_LEAGUES.map(league => league.id));
    expect(new Set(world.map(league => league.id)).size).toBe(world.length);
    const league = world.find(row => row.id === 'laliga')!, saved = career.world!.laliga;
    expect(saved.table.map(row => row.club).sort()).toEqual([...league.clubs].sort());
    expect(saved.table.reduce((sum, row) => sum + row.gf, 0)).toBe(saved.table.reduce((sum, row) => sum + row.ga, 0));
    const rows = sortedWorldTable(career, league.id, saved.table);
    expect(rows.every((row, index) => index === 0 || rows[index - 1].pts >= row.pts)).toBe(true);
    const view = render(<LeagueTableCard rows={rows} myClub={career.clubName} />);
    expect([...view.container.querySelectorAll('[data-goals]')].map(node => node.getAttribute('data-goals'))).toEqual(rows.map(row => `${row.gf}-${row.ga}`));
  });
});
