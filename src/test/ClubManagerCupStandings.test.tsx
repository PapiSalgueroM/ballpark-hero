import { fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { CupsPanel } from '@/components/club-manager/WorldCompScreen';
import { startCareer } from '@/lib/clubManager';

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
