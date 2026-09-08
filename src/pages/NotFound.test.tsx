import { render, screen } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/data/gameRegistry', async importOriginal => {
  const registry = await importOriginal<typeof import('@/data/gameRegistry')>();
  return process.env.NOT_FOUND_COUNT_CONTROL === 'exact'
    ? { ...registry, GAME_COUNT_LABEL: String(registry.TOTAL_GAMES) }
    : registry;
});

import NotFound from '@/pages/NotFound';
import { GAME_COUNT_LABEL, TOTAL_GAMES } from '@/data/gameRegistry';

describe('NotFound game count copy', () => {
  it('offers the rounded game count instead of a brittle exact total', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={['/missing-page']}>
          <NotFound />
        </MemoryRouter>
      </HelmetProvider>,
    );

    expect(screen.getByRole('link', { name: `See all ${GAME_COUNT_LABEL} games` })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: `See all ${TOTAL_GAMES} games` })).not.toBeInTheDocument();
  });
});
