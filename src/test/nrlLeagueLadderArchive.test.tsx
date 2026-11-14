import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createNrlCareer, nrlPastLadders, nrlSeasonOut, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { nrlLadder, NRL_SAVE_KEY } from '@/lib/nrlManager';
import { saveFence } from '@/lib/saveFence';
import NrlTeamManager from '@/pages/NrlTeamManager';

vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/RulesGate', () => ({ RulesGate: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));

const finish = (state: NrlCareerState) => {
  while (state.season.phase !== 'complete') state = reduceNrlCareer(state, { type: 'advance' });
  return state;
};
const reload = (state: NrlCareerState) => readNrlCareerSave(JSON.stringify(state));
const scope = ({ season }: NrlCareerState) => ({ year: season.year, clubId: season.clubId });
const tableRows = (state: NrlCareerState) => nrlLadder(state.season)
  .map(({ clubId, played, wins, draws, losses, points, differential }) => ({ clubId, played, wins, draws, losses, points, differential }));

afterEach(() => {
  cleanup();
  saveFence.release(NRL_SAVE_KEY);
  localStorage.clear();
});

describe('NRL past ladders', () => {
  it.each([[2026, 'storm', 'bears'], [2027, 'bears', 'chiefs']] as const)(
    'preserves the exact full %s league while moving from %s to %s', (year, clubId, destination) => {
      const end = finish(createNrlCareer(clubId, 4, year));
      const moved = reduceNrlCareer(end, { type: 'startNextSeason', move: { fromYear: year, clubId: destination } });
      expect(moved.season.clubId).toBe(destination);
      expect(nrlPastLadders(reload(moved)!)).toEqual([{ year, managedClubId: clubId, rows: tableRows(end) }]);
      const [archive] = moved.history;
      expect(archive.leagueLadder).toHaveLength(tableRows(end).length);
      const old = { ...moved, history: [{ ...archive, leagueLadder: undefined }] };
      expect(reload(old)).toEqual(JSON.parse(JSON.stringify(old)));
      expect(nrlPastLadders(reload(old)!)[0]).toMatchObject({ year, managedClubId: clubId, ranked: expect.any(Array) });
      expect(nrlPastLadders(reload(old)!)[0]).not.toHaveProperty('rows');
    });

  it('keeps new CPU season standings through a vacancy and keeps the original order-only save readable', () => {
    const ended = finish(createNrlCareer('storm', 4, 2026));
    const departed = reduceNrlCareer(ended, { type: 'leaveClub', ...scope(ended) });
    const skipped = reduceNrlCareer(departed, { type: 'simulateSeasonOut', ...scope(departed) });
    const report = nrlSeasonOut(skipped)!;
    const moved = reduceNrlCareer(skipped, {
      type: 'acceptVacancy', ...scope(skipped), joinYear: 2028, destinationId: report.vacancies[0].clubId,
    });
    const past = nrlPastLadders(reload(moved)!);
    expect(past.map(row => row.year)).toEqual([2027, 2026]);
    const [cpu] = past;
    if (!('rows' in cpu)) throw new Error('Missing full CPU standings');
    expect(cpu.rows.map(row => row.clubId)).toEqual(report.ladder);
    expect(cpu.managedClubId).toBeUndefined();
    const [prior] = moved.history;
    const older = { ...moved, history: [{ ...prior, seasonOut: { ...prior.seasonOut!, leagueLadder: undefined } }] };
    expect(reload(older)).toEqual(JSON.parse(JSON.stringify(older)));
    expect(nrlPastLadders(reload(older)!)[0]).toEqual({ year: 2027, ranked: report.ladder.map((clubId, index) => ({ clubId, rank: index + 1 })) });
  });

  it('rejects manipulated archived clubs, records and ordering', () => {
    const ended = finish(createNrlCareer('storm', 4, 2026));
    const moved = reduceNrlCareer(ended, { type: 'startNextSeason' });
    const [original] = moved.history;
    const rows = original.leagueLadder!;
    const first = rows[0];
    const attempt = (leagueLadder: unknown) =>
      readNrlCareerSave(JSON.stringify({ ...moved, history: [{ ...original, leagueLadder }] }));
    expect(attempt([first, ...rows.slice(0, -1)])).toBeNull();
    expect(attempt([['chiefs', ...first.slice(1)], ...rows.slice(1)])).toBeNull();
    expect(attempt([[first[0], 25, ...first.slice(2)], ...rows.slice(1)])).toBeNull();
    expect(attempt([[...first.slice(0, 3), first[3] + 1, first[4]], ...rows.slice(1)])).toBeNull();
    expect(attempt([rows[1], first, ...rows.slice(2)])).toBeNull();
  });

  it('opens historical ladders without writing and returns to current form and standings', () => {
    const ended = finish(createNrlCareer('storm', 4, 2026));
    const state = reduceNrlCareer(ended, { type: 'startNextSeason', move: { fromYear: 2026, clubId: 'bears' } });
    const raw = JSON.stringify(state);
    localStorage.setItem(NRL_SAVE_KEY, raw);
    render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Ladder' }));
    const year = screen.getByLabelText('Ladder season');
    fireEvent.change(year, { target: { value: '2026' } });
    const table = screen.getByRole('table', { name: '2026 regular-season ladder' });
    expect(within(table).getAllByRole('row')).toHaveLength(tableRows(ended).length + 1);
    expect(within(table).queryByRole('rowheader', { name: 'Bears' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Form and venue records' })).not.toBeInTheDocument();
    expect(localStorage.getItem(NRL_SAVE_KEY)).toBe(raw);
    fireEvent.change(year, { target: { value: '2027' } });
    expect(screen.getByRole('button', { name: 'Form and venue records' })).toBeVisible();
    expect(screen.getByRole('rowheader', { name: 'Bears' })).toBeVisible();
  });
});
