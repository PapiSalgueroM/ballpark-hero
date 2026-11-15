import { cleanup, render, screen, within } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { ALL_GAMES } from '@/data/gameRegistry';

vi.mock('@/data/gameContent/loader', () => ({
  peekGameContent: () => null,
  loadGameContent: async () => null,
}));

afterEach(cleanup);

const fixtures = [
  { route: '/soccer-career', hrefs: ['/fantasy-draft', '/transfer-path', '/squad-deal', '/club-manager', '/conquest', '/score-predictor'] },
  { route: '/club-manager', hrefs: ['/manager-hot-seat', '/deadline-day', '/soccer-conquest', '/soccer-career', '/conquest', '/f1-constructor'] },
  { route: '/nba-my-career', hrefs: ['/nba-gauntlet-draft', '/buzzer-beater', '/perfect-season-nba', '/nba-front-office', '/mlb-my-career', '/tennis-chain'] },
  { route: '/stadium-tycoon', hrefs: ['/wonderkid-factory', '/contract-chaos', '/world-xi', '/nfl-connections', '/nhl-gauntlet-draft', '/cbb-dynasty'] },
];

it.each(fixtures)('keeps the recommendations in order and lets phone users read their titles on $route', ({ route, hrefs }) => {
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[route]}>
        <GameSeoContent title="Game guide" description="Game guide description" reportControl={false} />
      </MemoryRouter>
    </HelmetProvider>,
  );

  const links = within(screen.getByRole('navigation', { name: 'More games' })).getAllByRole('link');
  expect(links.map(link => link.getAttribute('href'))).toEqual(hrefs);

  for (const [index, href] of hrefs.entries()) {
    const game = ALL_GAMES.find(candidate => candidate.path === href)!;
    const tile = within(links[index]);
    const title = tile.getByText(game.label);
    const description = tile.getByText(game.description);

    expect(title).not.toHaveClass('truncate');
    expect(title).toHaveClass('text-sm', 'sm:truncate', 'sm:text-xs');
    expect(description).toHaveClass('text-xs', 'sm:text-[10px]');
  }
});
