import { render, screen, waitFor, within } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import GameSeoContent from '@/components/seo/GameSeoContent';

describe('GameSeoContent', () => {
  it('keeps the page title visible while the long guide starts collapsed', async () => {
    const { container } = render(
      <HelmetProvider>
        <MemoryRouter initialEntries={['/footle']}>
          <GameSeoContent title="Footle player guessing game" description="Guess the player." />
        </MemoryRouter>
      </HelmetProvider>,
    );

    await waitFor(() => expect(container.querySelector('[data-seo-content="ready"]')).toBeInTheDocument());

    const heading = screen.getByRole('heading', { level: 1, name: 'Footle player guessing game' });
    const details = container.querySelector('details');

    expect(details).toBeInTheDocument();
    expect(details).not.toHaveAttribute('open');
    expect(within(details as HTMLElement).getByText('Game guide')).toBeInTheDocument();
    expect(within(details as HTMLElement).getByRole('heading', { name: 'How to play Footle' })).toBeInTheDocument();
    expect(details).not.toContainElement(heading);
  });

  it('does not render a second related-games navigation', async () => {
    const { container } = render(
      <HelmetProvider>
        <MemoryRouter initialEntries={['/footle']}>
          <GameSeoContent title="Footle" description="Guess the player." pageHasOwnH1 />
        </MemoryRouter>
      </HelmetProvider>,
    );

    await waitFor(() => expect(container.querySelector('[data-seo-content="ready"]')).toBeInTheDocument());

    expect(screen.queryByRole('navigation', { name: 'More games' })).not.toBeInTheDocument();
  });
});
