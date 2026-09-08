import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { GameNav } from '@/components/game/GameNav';

function renderNav(path: string, currentPath?: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <GameNav currentPath={currentPath} />
    </MemoryRouter>,
  );
}

describe('GameNav', () => {
  it('renders the stable six-link graph as the one Play Next section for a registered game', () => {
    renderNav('/perfect-lineup-nba');

    const nav = screen.getByRole('navigation', { name: 'Play next' });
    const gameLinks = within(nav)
      .getAllByRole('link')
      .filter(link => link.getAttribute('href') !== '/');

    expect(gameLinks).toHaveLength(6);
    expect(gameLinks.slice(0, 3).map(link => link.getAttribute('href'))).toEqual([
      '/conquest-nba',
      '/nba-front-office',
      '/nba-my-career',
    ]);
    expect(nav).not.toHaveAttribute('data-no-prerender');
  });

  it('keeps a volatile fallback Play Next section for an unregistered route', () => {
    renderNav('/guess-nfl-team');

    const nav = screen.getByRole('navigation', { name: 'Play next' });
    const gameLinks = within(nav)
      .getAllByRole('link')
      .filter(link => link.getAttribute('href') !== '/');

    expect(gameLinks).toHaveLength(3);
    expect(nav).toHaveAttribute('data-no-prerender', 'true');
  });
});
