import { fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { CalendarCard } from '@/components/club-manager/CalendarCard';
import { CupsPanel } from '@/components/club-manager/WorldCompScreen';
import { fixtureFor, playNextEntry, startCareer } from '@/lib/clubManager';

it('shows where cup standings are and explains a fifth-place club in its opening season', () => {
  const career = startCareer('Real Betis');
  const onClubClick = vi.fn();
  const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  try {
    const view = render(
      <MemoryRouter>
        <CupsPanel career={career} onClubClick={onClubClick}
          cupTitle="Copa del Rey" cupValue="Round of 16" uclHeading={<h2>Champions League</h2>} />
      </MemoryRouter>,
    );
    expect(view.getByText(/choose Table or Groups for standings/)).toBeVisible();
    fireEvent.click(view.getByRole('button', { name: /Champions League/ }));
    expect(view.getByText(/Your first season starts after those places were assigned/)).toBeVisible();
    expect(view.queryByText(/your own Europa League nights are not in the game yet/)).toBeNull();
    fireEvent.click(view.getByRole('button', { name: /Table 36 clubs/ }));
    expect(view.container.querySelector('[data-cm-world-table="36"]')).toBeVisible();
    expect(onClubClick).not.toHaveBeenCalled();
  } finally {
    scrollTo.mockRestore();
  }
});

it('opens the real played league table and the same eight fixtures in the calendar', () => {
  let career = startCareer('Arsenal', undefined, undefined, undefined, undefined, undefined, { playedUclLeaguePhase: true });
  const md8 = career.calendar.find(entry => entry.type === 'uclGroup' && entry.round === 7)!;
  const opponent = fixtureFor(career, md8)?.opponent;
  for (let step = 0; step < 12 && career.uclGroup?.matchday === 0; step++) {
    career = playNextEntry(career, { skipHalftime: true, noCoach: true, noBook: true }).state;
  }
  expect(career.uclGroup?.matchday).toBe(1);
  const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  try {
    const view = render(
      <MemoryRouter>
        <CupsPanel career={career} onClubClick={vi.fn()}
          cupTitle="FA Cup" cupValue="Round of 16" uclHeading={<h2>Champions League</h2>} />
        <CalendarCard career={career} />
      </MemoryRouter>,
    );
    fireEvent.click(view.getByRole('button', { name: 'More' }));
    expect(view.getByText('⭐ UCL League MD8').parentElement).toHaveTextContent(opponent!);
    fireEvent.click(view.getByRole('button', { name: /Champions League/ }));
    expect(view.getByText('League phase, matchday 1 of 8')).toBeVisible();
    fireEvent.click(view.getByRole('button', { name: /Table / }));
    const table = view.container.querySelector('[data-cm-world-table="36"]');
    expect(table).toBeVisible();
    expect(table?.querySelectorAll('[data-club]')).toHaveLength(36);
    expect(table?.querySelectorAll('[data-zone="through"]')).toHaveLength(8);
    expect(table?.querySelectorAll('[data-zone="playoff"]')).toHaveLength(16);
    expect(table?.querySelectorAll('[data-zone="out"]')).toHaveLength(12);
    expect(view.queryByRole('button', { name: 'Group A' })).toBeNull();
  } finally {
    scrollTo.mockRestore();
  }
});
