import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { createNrlCareer, reduceNrlCareer } from '@/lib/nrlCareer';
import { NRL_SAVE_KEY, nrlFinalsRace, nrlRegularRounds } from '@/lib/nrlManager';
import { fenceKeyOf, saveFence } from '@/lib/saveFence';
import NrlTeamManager from '@/pages/NrlTeamManager';

vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/RulesGate', () => ({ RulesGate: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));

afterEach(() => {
  cleanup();
  saveFence.release(NRL_SAVE_KEY);
  localStorage.clear();
});

it.each([[2026, 'broncos'], [2027, 'bears']] as const)(
  'shows the real %s closing rounds and points range without saving',
  (year, club) => {
    let career = createNrlCareer(club, 4, year);
    while (career.season.round < nrlRegularRounds(year) - 3) career = reduceNrlCareer(career, { type: 'advance' });
    const race = nrlFinalsRace(career.season)!;
    const raw = JSON.stringify(career);
    const fence = fenceKeyOf(NRL_SAVE_KEY);
    localStorage.setItem(NRL_SAVE_KEY, raw);
    localStorage.setItem(fence, '4');
    render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Ladder' }));
    const summary = screen.getByText('Finals race', { exact: true });
    const details = summary.closest('details')!;
    expect(details.open).toBe(false);
    details.open = true;
    const panel = within(details);
    const status = { secured: 'Secured', open: 'Still open', out: 'Out of reach' };
    expect(panel.getByText('Top eight').nextElementSibling).toHaveTextContent(status[race.topEight]);
    expect(panel.getByText('Top four').nextElementSibling).toHaveTextContent(status[race.topFour]);
    const points = race.minimum === race.maximum ? String(race.minimum) : [race.minimum, race.maximum].join(' to ');
    expect(panel.getByText(points, { exact: true })).toBeVisible();
    const matches = within(panel.getByRole('list', { name: 'Remaining club rounds' })).getAllByRole('listitem');
    expect(matches).toHaveLength(4);
    expect(matches.map(row => row.getAttribute('data-nrl-finals-race-round'))).toEqual(race.remaining.map(match => String(match.round)));
    expect(matches.filter(row => row.textContent?.includes('Bye'))).toHaveLength(race.remaining.filter(match => match.opponentId === null).length);
    expect(localStorage.getItem(NRL_SAVE_KEY)).toBe(raw);
    expect(localStorage.getItem(fence)).toBe('4');
  },
);
